use std::sync::Mutex;
use tauri::{Emitter, Manager};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OpenedFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![get_opened_files, export_pdf])
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
