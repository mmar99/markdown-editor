import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { HugeiconsIcon, ArrowUp01Icon, ArrowDown01Icon, ArrowDataTransferVerticalIcon, Cancel01Icon } from "../Icons";
import "./FindReplace.css";

interface Props {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
}

const CLOSE_ANIM_MS = 180;

export function FindReplace({ editor, open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Controls DOM presence + exit animation
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shake on no-results
  const [shaking, setShaking] = useState(false);
  const prevNoResults = useRef(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setClosing(false);
      setVisible(true);
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else if (visible) {
      setClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setClosing(false);
        editor?.commands.clearSearch();
        setQuery("");
        setReplaceText("");
        setReplaceOpen(false);
        setMatchCount(0);
        setCurrentIndex(0);
      }, CLOSE_ANIM_MS);
    }
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, [open]); // eslint-disable-line

  const syncMatchInfo = useCallback(() => {
    if (!editor) return;
    const storage = (editor.extensionStorage as unknown as Record<string, { matchCount: number; currentIndex: number }>).findReplace;
    if (storage) {
      setMatchCount(storage.matchCount);
      setCurrentIndex(storage.currentIndex);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor || !visible || closing) return;
    editor.commands.setSearchTerm(query);
    syncMatchInfo();
  }, [query, editor, visible, closing, syncMatchInfo]);

  // Trigger shake when results drop to zero
  const hasQuery = query.length > 0;
  const noResults = hasQuery && matchCount === 0;

  useEffect(() => {
    if (noResults && !prevNoResults.current && hasQuery) {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
    prevNoResults.current = noResults;
  }, [noResults, hasQuery]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (matchCount === 0) return;
      if (e.metaKey || e.ctrlKey) { editor?.commands.findPrev(); }
      else { editor?.commands.findNext(); }
      syncMatchInfo();
    }
  }, [editor, matchCount, onClose, syncMatchInfo]);

  const handleReplaceKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "Enter") { e.preventDefault(); handleReplaceOne(); }
  }, []); // eslint-disable-line

  const handleNext = useCallback(() => {
    if (matchCount === 0) return;
    editor?.commands.findNext();
    syncMatchInfo();
  }, [editor, matchCount, syncMatchInfo]);

  const handlePrev = useCallback(() => {
    if (matchCount === 0) return;
    editor?.commands.findPrev();
    syncMatchInfo();
  }, [editor, matchCount, syncMatchInfo]);

  const handleReplaceOne = useCallback(() => {
    if (!editor || matchCount === 0) return;
    editor.commands.replaceOne(replaceText);
    setTimeout(() => { editor.commands.setSearchTerm(query); syncMatchInfo(); }, 0);
  }, [editor, matchCount, replaceText, query, syncMatchInfo]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || matchCount === 0) return;
    editor.commands.replaceAll(replaceText);
    setTimeout(() => { editor.commands.setSearchTerm(query); syncMatchInfo(); }, 0);
  }, [editor, matchCount, replaceText, query, syncMatchInfo]);

  if (!visible) return null;

  return (
    <div
      className={`find-replace-widget${closing ? " find-replace-widget--closing" : ""}`}
      role="search"
      aria-label="Find and replace"
    >
      {/* Search row */}
      <div className="find-replace-row">
        {/* Shake wrapper is separate from the input so animation never interferes with color */}
        <div className={shaking ? "find-replace-shake-wrap" : undefined} style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <input
            ref={searchInputRef}
            className={`find-replace-input${noResults ? " find-replace-input--no-results" : ""}`}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Find…"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <div className="find-replace-controls">
          {hasQuery && (
            <span className={`find-replace-counter${noResults ? " find-replace-counter--empty" : ""}`}>
              {noResults ? "No results" : `${currentIndex + 1} of ${matchCount}`}
            </span>
          )}

          <button className="find-replace-btn" onClick={handlePrev} disabled={matchCount === 0} title="Previous match (⌘↩)" aria-label="Previous match">
            <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
          </button>

          <button className="find-replace-btn" onClick={handleNext} disabled={matchCount === 0} title="Next match (↩)" aria-label="Next match">
            <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
          </button>

          <button
            className={`find-replace-btn${replaceOpen ? " find-replace-btn--active" : ""}`}
            onClick={() => setReplaceOpen((v) => !v)}
            title="Replace (⌘⌥F)"
            aria-label="Toggle replace panel"
            aria-expanded={replaceOpen}
          >
            <HugeiconsIcon icon={ArrowDataTransferVerticalIcon} size={13} strokeWidth={1.4} />
          </button>

          <button className="find-replace-btn find-replace-btn--close" onClick={onClose} aria-label="Close find">
            <HugeiconsIcon icon={Cancel01Icon} size={11} />
          </button>
        </div>
      </div>

      {/* Replace row */}
      {replaceOpen && (
        <div className="find-replace-row find-replace-row--replace">
          <input
            className="find-replace-input"
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder="Replace with…"
            spellCheck={false}
            autoComplete="off"
          />
          <div className="find-replace-replace-actions">
            <button className="find-replace-action-btn" onClick={handleReplaceAll} disabled={matchCount === 0}>Replace all</button>
            <button className="find-replace-action-btn find-replace-action-btn--primary" onClick={handleReplaceOne} disabled={matchCount === 0}>Replace ↵</button>
          </div>
        </div>
      )}
    </div>
  );
}
