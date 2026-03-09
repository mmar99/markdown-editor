use std::sync::{Mutex, LazyLock};
use std::time::SystemTime;
use tauri::{Emitter, Manager};
use serde::Serialize;
use walkdir::WalkDir;
use regex::{Regex, RegexBuilder};

pub struct OpenedFiles(pub Mutex<Vec<String>>);

#[tauri::command]
fn get_opened_files(state: tauri::State<'_, OpenedFiles>) -> Vec<String> {
    let mut files = state.0.lock().unwrap();
    files.drain(..).collect()
}

/// Export HTML content to PDF using Chrome headless (available on most Macs).
/// Falls back to textutil if Chrome is not installed.
#[tauri::command]
fn export_pdf(html: String, output_path: String) -> Result<(), String> {
    use std::fs;
    use std::process::Command;

    let tmp_html = "/tmp/markdown-export-temp.html";
    fs::write(tmp_html, &html).map_err(|e| format!("Write failed: {}", e))?;

    // Try Chrome headless first (most reliable)
    let chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];

    for chrome in &chrome_paths {
        if std::path::Path::new(chrome).exists() {
            let result = Command::new(chrome)
                .args([
                    "--headless",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--no-pdf-header-footer",
                    &format!("--print-to-pdf={}", output_path),
                    &format!("file://{}", tmp_html),
                ])
                .output();

            if let Ok(output) = result {
                if output.status.success() && std::path::Path::new(&output_path).exists() {
                    let _ = fs::remove_file(tmp_html);
                    return Ok(());
                }
            }
        }
    }

    let _ = fs::remove_file(tmp_html);
    Err("No PDF converter found. Install Google Chrome for PDF export.".to_string())
}

// ── Content Search Types ─────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct ContentMatch {
    file_path: String,
    file_name: String,
    line_number: usize,
    line_text: String,
    match_start: usize,
    match_end: usize,
    result_type: String, // "file" or "content"
}

/// Internal struct for scoring (not sent to frontend)
struct ScoredMatch {
    file_path: String,
    file_name: String,
    line_number: usize,
    raw_line: String,
    score: f64,
    result_type: String, // "file" or "content"
}

// ── Scoring Weights (tunable) ────────────────────────────────────────

const WEIGHT_WORD_BOUNDARY: f64 = 50.0;
const WEIGHT_FILENAME_MATCH: f64 = 25.0;
const WEIGHT_EXACT_CASE: f64 = 20.0;
const WEIGHT_HEADING: f64 = 15.0;
const WEIGHT_DENSITY: f64 = 15.0;
const WEIGHT_TITLE_AREA: f64 = 10.0;
const WEIGHT_POSITION: f64 = 10.0;
const WEIGHT_PATH_DEPTH: f64 = 10.0;
const WEIGHT_RECENCY: f64 = 5.0;

// ── File Filters ─────────────────────────────────────────────────────

const MD_EXTENSIONS: &[&str] = &[".md", ".markdown", ".mdx", ".txt"];
const SKIP_DIRS: &[&str] = &[
    "node_modules", "dist", "build", "target", "__pycache__", ".git", "venv", "env",
];

fn is_markdown_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    MD_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

fn is_skip_dir(name: &str) -> bool {
    name.starts_with('.') || SKIP_DIRS.contains(&name)
}

// ── Markdown Stripping ───────────────────────────────────────────────

static RE_IMAGE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"!\[([^\]]*)\]\([^)]*\)").unwrap());
static RE_LINK: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\[([^\]]*)\]\([^)]*\)").unwrap());
static RE_BOLD_ITALIC: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\*{3}(.+?)\*{3}|_{3}(.+?)_{3}").unwrap());
static RE_BOLD: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\*{2}(.+?)\*{2}|_{2}(.+?)_{2}").unwrap());
// Italic: *text* or _text_ — simple approach, runs AFTER bold is already stripped
static RE_ITALIC_STAR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\*([^*]+)\*").unwrap());
static RE_ITALIC_UNDER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b_([^_]+)_\b").unwrap());
static RE_STRIKE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"~~(.+?)~~").unwrap());
static RE_CODE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"`([^`]+)`").unwrap());
static RE_HEADING: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^#{1,6}\s+").unwrap());
static RE_TABLE_OUTER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\s*\|\s*|\s*\|\s*$").unwrap());
static RE_TABLE_INNER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s*\|\s*").unwrap());
static RE_TABLE_SEPARATOR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\s*\|?[\s\-:]+\|[\s\-:|]+$").unwrap());
static RE_BLOCKQUOTE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^>\s*").unwrap());
static RE_UL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\s*[-*+]\s+").unwrap());
static RE_OL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\s*\d+\.\s+").unwrap());
static RE_HTML: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

/// Strips markdown syntax from a line, returning clean plain text.
fn strip_markdown(line: &str) -> String {
    let trimmed = line.trim();

    // Front-matter markers
    if trimmed == "---" || trimmed == "..." {
        return String::new();
    }

    // Table separator lines (|---|---|)
    if RE_TABLE_SEPARATOR.is_match(trimmed) {
        return String::new();
    }

    let mut s = line.to_string();

    // Order matters for nesting: images before links, bold-italic before bold before italic
    s = RE_IMAGE.replace_all(&s, "$1").to_string();
    s = RE_LINK.replace_all(&s, "$1").to_string();
    s = RE_BOLD_ITALIC.replace_all(&s, |caps: &regex::Captures| {
        caps.get(1).or_else(|| caps.get(2)).map_or("", |m| m.as_str()).to_string()
    }).to_string();
    s = RE_BOLD.replace_all(&s, |caps: &regex::Captures| {
        caps.get(1).or_else(|| caps.get(2)).map_or("", |m| m.as_str()).to_string()
    }).to_string();
    s = RE_ITALIC_STAR.replace_all(&s, "$1").to_string();
    s = RE_ITALIC_UNDER.replace_all(&s, "$1").to_string();
    s = RE_STRIKE.replace_all(&s, "$1").to_string();
    s = RE_CODE.replace_all(&s, "$1").to_string();
    s = RE_HEADING.replace(&s, "").to_string();
    s = RE_TABLE_OUTER.replace_all(&s, "").to_string();
    s = RE_TABLE_INNER.replace_all(&s, "  ").to_string();
    s = RE_BLOCKQUOTE.replace(&s, "").to_string();
    s = RE_UL.replace(&s, "").to_string();
    s = RE_OL.replace(&s, "").to_string();
    s = RE_HTML.replace_all(&s, "").to_string();

    s.trim().to_string()
}

/// Snaps a byte position to the nearest valid UTF-8 char boundary (searching backward).
fn snap_to_char_boundary(s: &str, pos: usize) -> usize {
    if pos >= s.len() {
        return s.len();
    }
    let mut p = pos;
    while p > 0 && !s.is_char_boundary(p) {
        p -= 1;
    }
    p
}

/// Truncates text around the match, centering on the match position.
/// All slicing is UTF-8 safe (handles accented chars like é, ã, ú).
fn truncate_around_match(text: &str, re: &Regex, max_len: usize) -> String {
    if text.len() <= max_len {
        return text.to_string();
    }

    let match_center = re.find(text).map(|m| m.start()).unwrap_or(0);
    let raw_start = match_center.saturating_sub(max_len / 2);
    let raw_end = (raw_start + max_len).min(text.len());

    // Snap to valid UTF-8 char boundaries
    let start = snap_to_char_boundary(text, raw_start);
    let end = snap_to_char_boundary(text, raw_end);

    let mut snippet = String::new();
    if start > 0 {
        snippet.push_str("...");
    }
    snippet.push_str(&text[start..end]);
    if end < text.len() {
        snippet.push_str("...");
    }
    snippet
}

// ── Search Command ───────────────────────────────────────────────────

/// Search content of all markdown files in the workspace.
/// Returns up to 50 matches, ranked by relevance (word boundary, case, heading, position, recency).
/// Snippets are stripped of markdown syntax for clean display.
#[tauri::command]
fn search_content(query: String, workspace_path: String) -> Vec<ContentMatch> {
    if query.is_empty() || workspace_path.is_empty() {
        return Vec::new();
    }

    let escaped = regex::escape(&query);

    // Main regex: case-insensitive
    let re = match RegexBuilder::new(&escaped).case_insensitive(true).build() {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    // Exact case regex: case-sensitive
    let re_exact = RegexBuilder::new(&escaped).case_insensitive(false).build().ok();

    // Word boundary regex: whole word match
    let re_word = RegexBuilder::new(&format!(r"\b{}\b", &escaped))
        .case_insensitive(true)
        .build()
        .ok();

    let now = SystemTime::now();
    let max_collect = 2000; // Safety cap
    let max_line_len = 200;

    let mut scored: Vec<ScoredMatch> = Vec::new();

    for entry in WalkDir::new(&workspace_path)
        .max_depth(6)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            if e.file_type().is_dir() {
                !is_skip_dir(&name)
            } else {
                true
            }
        })
    {
        if scored.len() >= max_collect {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_type().is_dir() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        if !is_markdown_file(&file_name) {
            continue;
        }

        let path = entry.path();

        // Get file recency (days since last modification)
        let days_ago = entry.metadata().ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| now.duration_since(t).ok())
            .map(|d| d.as_secs() as f64 / 86400.0)
            .unwrap_or(365.0);

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // ── File-level signals (computed once per file) ──

        // Filename match: does the query appear in the filename?
        let filename_match = re.is_match(&file_name);

        // Path depth: fewer segments = more primary
        // workspace/CLAUDE.md (depth 1) > workspace/tools/CLAUDE.md (depth 2)
        let rel_path = path.strip_prefix(&workspace_path).unwrap_or(path);
        let depth = rel_path.components().count().max(1) as f64;
        let depth_score = WEIGHT_PATH_DEPTH * (1.0 / depth);

        // Match density: count total matches in the file (capped at 50 for scoring)
        let match_count = re.find_iter(&content).count().min(50) as f64;
        // Density score: log scale so 1 match = 0, 10 matches = ~15, 50 matches = ~15
        let density_score = if match_count > 1.0 {
            WEIGHT_DENSITY * (match_count.ln() / 50_f64.ln())
        } else {
            0.0
        };

        // ── Add "file" result if filename matches the query ──
        if filename_match {
            let mut file_score: f64 = 0.0;
            // Filename match is the primary signal for file results
            file_score += WEIGHT_FILENAME_MATCH;
            // Word boundary on filename
            if let Some(ref rw) = re_word {
                if rw.is_match(&file_name) { file_score += WEIGHT_WORD_BOUNDARY; }
            }
            // Exact case on filename
            if let Some(ref re_ex) = re_exact {
                if re_ex.is_match(&file_name) { file_score += WEIGHT_EXACT_CASE; }
            }
            // Density bonus (files with many mentions rank higher)
            file_score += density_score;
            // Path depth
            file_score += depth_score;
            // Recency
            file_score += WEIGHT_RECENCY * (1.0 - (days_ago / 365.0).min(1.0));

            scored.push(ScoredMatch {
                file_path: path.to_string_lossy().to_string(),
                file_name: file_name.clone(),
                line_number: 0,
                raw_line: String::new(),
                score: file_score,
                result_type: "file".to_string(),
            });
        }

        for (line_idx, line) in content.lines().enumerate() {
            if scored.len() >= max_collect {
                break;
            }

            if let Some(mat) = re.find(line) {
                let line_number = line_idx + 1;
                let line_len = line.len().max(1);

                // ── Compute score ──
                let mut score: f64 = 0.0;

                // Signal 1: Word boundary (50 pts) — "Rio" whole word vs "Scenario" substring
                if let Some(ref rw) = re_word {
                    if rw.is_match(line) {
                        score += WEIGHT_WORD_BOUNDARY;
                    }
                }

                // Signal 2: Filename match (25 pts) — query appears in the filename
                if filename_match {
                    score += WEIGHT_FILENAME_MATCH;
                }

                // Signal 3: Exact case (20 pts) — "Rio" matches "Rio" exactly
                if let Some(ref re) = re_exact {
                    if re.is_match(line) {
                        score += WEIGHT_EXACT_CASE;
                    }
                }

                // Signal 4: Heading line (15 pts) — match in a heading
                if line.trim_start().starts_with('#') {
                    score += WEIGHT_HEADING;
                }

                // Signal 5: Match density (15 pts, log scale) — more matches in file = more relevant
                score += density_score;

                // Signal 6: Title area (10 pts) — first 10 lines of file
                if line_number <= 10 {
                    score += WEIGHT_TITLE_AREA * (1.0 - (line_number - 1) as f64 / 10.0);
                }

                // Signal 7: Match position in line (10 pts) — earlier = better
                score += WEIGHT_POSITION * (1.0 - mat.start() as f64 / line_len as f64);

                // Signal 8: Path depth / primacy (10 pts) — root-level files rank higher
                score += depth_score;

                // Signal 9: File recency (5 pts) — recently modified = better
                score += WEIGHT_RECENCY * (1.0 - (days_ago / 365.0).min(1.0));

                scored.push(ScoredMatch {
                    file_path: path.to_string_lossy().to_string(),
                    file_name: file_name.clone(),
                    line_number,
                    raw_line: line.to_string(),
                    score,
                    result_type: "content".to_string(),
                });
            }
        }
    }

    // Sort by score descending, then file path, then line number
    scored.sort_by(|a, b| {
        b.score.partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.file_path.cmp(&b.file_path))
            .then_with(|| a.line_number.cmp(&b.line_number))
    });

    // Take top 50, strip markdown, recalculate match positions
    scored.truncate(50);

    scored.into_iter().filter_map(|s| {
        if s.result_type == "file" {
            // File result: no snippet, just the file entry
            Some(ContentMatch {
                file_path: s.file_path,
                file_name: s.file_name,
                line_number: 0,
                line_text: String::new(),
                match_start: 0,
                match_end: 0,
                result_type: "file".to_string(),
            })
        } else {
            // Content result: strip markdown, truncate, recalculate positions
            let stripped = strip_markdown(&s.raw_line);
            if stripped.is_empty() {
                return None;
            }
            let line_text = truncate_around_match(&stripped, &re, max_line_len);
            let (m_start, m_end) = re.find(&line_text)
                .map(|m| (m.start(), m.end()))
                .unwrap_or((0, 0));
            Some(ContentMatch {
                file_path: s.file_path,
                file_name: s.file_name,
                line_number: s.line_number,
                line_text,
                match_start: m_start,
                match_end: m_end,
                result_type: "content".to_string(),
            })
        }
    })
    .collect()
}

// ── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Markdown Stripping Tests ──

    #[test]
    fn strip_heading_h1() {
        assert_eq!(strip_markdown("# My Title"), "My Title");
    }

    #[test]
    fn strip_heading_h3() {
        assert_eq!(strip_markdown("### Scenario catastrophe"), "Scenario catastrophe");
    }

    #[test]
    fn strip_bold() {
        assert_eq!(strip_markdown("**Rio** Retrogames"), "Rio Retrogames");
    }

    #[test]
    fn strip_italic_star() {
        // Standalone italic at start of line
        assert_eq!(strip_markdown("*italic text*"), "italic text");
    }

    #[test]
    fn strip_inline_code() {
        assert_eq!(strip_markdown("use `cargo build` here"), "use cargo build here");
    }

    #[test]
    fn strip_link() {
        assert_eq!(strip_markdown("[click here](https://example.com)"), "click here");
    }

    #[test]
    fn strip_image() {
        assert_eq!(strip_markdown("![alt text](image.png)"), "alt text");
    }

    #[test]
    fn strip_table_row() {
        assert_eq!(strip_markdown("| Rio | 2024 |"), "Rio  2024");
    }

    #[test]
    fn strip_table_separator() {
        assert_eq!(strip_markdown("|---|---|"), "");
    }

    #[test]
    fn strip_blockquote() {
        assert_eq!(strip_markdown("> This is a quote"), "This is a quote");
    }

    #[test]
    fn strip_unordered_list() {
        assert_eq!(strip_markdown("- Art fairs:"), "Art fairs:");
    }

    #[test]
    fn strip_ordered_list() {
        assert_eq!(strip_markdown("1. First item"), "First item");
    }

    #[test]
    fn strip_combined() {
        assert_eq!(strip_markdown("### [Link](url) with **bold**"), "Link with bold");
    }

    #[test]
    fn strip_plain_text() {
        assert_eq!(strip_markdown("Plain text line"), "Plain text line");
    }

    #[test]
    fn strip_frontmatter() {
        assert_eq!(strip_markdown("---"), "");
    }

    #[test]
    fn strip_strikethrough() {
        assert_eq!(strip_markdown("~~deleted~~"), "deleted");
    }

    // ── Scoring Tests ──

    /// Compute score for a single line match with all signals.
    /// `filename_match`: does the query appear in the filename?
    /// `match_count`: how many times does the query appear in the whole file?
    /// `depth`: path depth (1 = root level)
    fn compute_score(
        line: &str, query: &str, line_number: usize, days_ago: f64,
        filename_match: bool, match_count: usize, depth: usize,
    ) -> f64 {
        let escaped = regex::escape(query);
        let re = RegexBuilder::new(&escaped).case_insensitive(true).build().unwrap();
        let re_exact = RegexBuilder::new(&escaped).case_insensitive(false).build().ok();
        let re_word = RegexBuilder::new(&format!(r"\b{}\b", &escaped))
            .case_insensitive(true).build().ok();

        let mat = re.find(line).unwrap();
        let line_len = line.len().max(1);
        let mut score: f64 = 0.0;

        if let Some(ref rw) = re_word {
            if rw.is_match(line) { score += WEIGHT_WORD_BOUNDARY; }
        }
        if filename_match { score += WEIGHT_FILENAME_MATCH; }
        if let Some(ref re) = re_exact {
            if re.is_match(line) { score += WEIGHT_EXACT_CASE; }
        }
        if line.trim_start().starts_with('#') { score += WEIGHT_HEADING; }
        let mc = match_count.min(50) as f64;
        if mc > 1.0 {
            score += WEIGHT_DENSITY * (mc.ln() / 50_f64.ln());
        }
        if line_number <= 10 {
            score += WEIGHT_TITLE_AREA * (1.0 - (line_number - 1) as f64 / 10.0);
        }
        score += WEIGHT_POSITION * (1.0 - mat.start() as f64 / line_len as f64);
        score += WEIGHT_PATH_DEPTH * (1.0 / depth.max(1) as f64);
        score += WEIGHT_RECENCY * (1.0 - (days_ago / 365.0).min(1.0));

        score
    }

    #[test]
    fn score_word_boundary_higher() {
        let s1 = compute_score("Rio Retrogames", "rio", 20, 30.0, false, 1, 2);
        let s2 = compute_score("Scenario catastrophe", "rio", 20, 30.0, false, 1, 2);
        assert!(s1 > s2, "Whole word 'Rio' ({}) should score higher than substring 'rio' in 'Scenario' ({})", s1, s2);
    }

    #[test]
    fn score_exact_case_higher() {
        let s1 = compute_score("Rio Retrogames", "Rio", 20, 30.0, false, 1, 2);
        let s2 = compute_score("rio retrogames", "Rio", 20, 30.0, false, 1, 2);
        assert!(s1 > s2, "Exact case ({}) should score higher than different case ({})", s1, s2);
    }

    #[test]
    fn score_heading_boost() {
        let s1 = compute_score("# Rio Title", "rio", 20, 30.0, false, 1, 2);
        let s2 = compute_score("Rio in body text", "rio", 20, 30.0, false, 1, 2);
        assert!(s1 > s2, "Heading ({}) should score higher than body ({})", s1, s2);
    }

    #[test]
    fn score_title_area_boost() {
        let s1 = compute_score("Rio text", "rio", 1, 30.0, false, 1, 2);
        let s2 = compute_score("Rio text", "rio", 50, 30.0, false, 1, 2);
        assert!(s1 > s2, "Line 1 ({}) should score higher than line 50 ({})", s1, s2);
    }

    #[test]
    fn score_position_start_vs_end() {
        let s1 = compute_score("Rio is at the start", "rio", 20, 30.0, false, 1, 2);
        let s2 = compute_score("At the end is Rio", "rio", 20, 30.0, false, 1, 2);
        assert!(s1 > s2, "Start position ({}) should score higher than end ({})", s1, s2);
    }

    #[test]
    fn score_filename_match_boost() {
        // File named "claude.md" matching "claude" should score higher than a random file
        let s1 = compute_score("Some text with claude", "claude", 20, 30.0, true, 1, 2);
        let s2 = compute_score("Some text with claude", "claude", 20, 30.0, false, 1, 2);
        assert!(s1 > s2, "Filename match ({}) should score higher than no filename match ({})", s1, s2);
    }

    #[test]
    fn score_density_boost() {
        // File with 20 matches should score higher than file with 1 match
        let s1 = compute_score("Some text with claude", "claude", 20, 30.0, false, 20, 2);
        let s2 = compute_score("Some text with claude", "claude", 20, 30.0, false, 1, 2);
        assert!(s1 > s2, "High density ({}) should score higher than low density ({})", s1, s2);
    }

    #[test]
    fn score_path_depth_root_higher() {
        // Root-level file (depth 1) should score higher than deeply nested (depth 4)
        let s1 = compute_score("Some text with claude", "claude", 20, 30.0, false, 1, 1);
        let s2 = compute_score("Some text with claude", "claude", 20, 30.0, false, 1, 4);
        assert!(s1 > s2, "Root file ({}) should score higher than nested file ({})", s1, s2);
    }

    // ── UTF-8 Safety Tests ──

    #[test]
    fn truncate_utf8_accented_chars() {
        // This must NOT panic — accented chars like é are 2 bytes in UTF-8
        let re = Regex::new("rio").unwrap();
        let text = "Pergunte ao Antiquário de São Paulo, encontre Rio de Janeiro peças raras e únicos exemplares disponíveis para colecionadores interessados em arte brasileira";
        let result = truncate_around_match(text, &re, 80);
        assert!(result.len() > 0, "Should produce a non-empty snippet");
        assert!(result.contains("rio") || result.contains("Rio"), "Should contain the match");
    }

    #[test]
    fn strip_markdown_with_accents() {
        assert_eq!(strip_markdown("**São Paulo**"), "São Paulo");
        assert_eq!(strip_markdown("### Café com leite"), "Café com leite");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OpenedFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![get_opened_files, export_pdf, search_content])
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|url| {
                        if url.scheme() == "file" {
                            url.to_file_path().ok()?.to_str().map(String::from)
                        } else {
                            None
                        }
                    })
                    .collect();

                if paths.is_empty() {
                    return;
                }

                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.set_focus();
                    let _ = window.show();
                }

                let _ = app_handle.emit("open-files", &paths);

                if let Some(state) = app_handle.try_state::<OpenedFiles>() {
                    let mut stored = state.0.lock().unwrap();
                    stored.extend(paths);
                }
            }
        });
}
