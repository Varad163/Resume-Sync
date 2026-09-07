import { useState, useRef, useEffect } from "react";
import { DOC_PAGES } from "./docsIndex.js";

interface DocsSearchProps {
  onSelectDoc: (path: string) => void;
}

export function DocsSearch({ onSelectDoc }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredResults = query.trim()
    ? DOC_PAGES.filter((page) => {
        const q = query.toLowerCase();
        return (
          page.title.toLowerCase().includes(q) ||
          page.subtitle.toLowerCase().includes(q) ||
          page.keywords.some((k) => k.toLowerCase().includes(q))
        );
      })
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="docs-search-container" ref={wrapperRef}>
      <div className="docs-search-input-wrapper">
        <SearchIcon />
        <input
          type="text"
          className="docs-search-input"
          placeholder="Search documentation (e.g. Watchtower, CBOM, GitHub)..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
        />
        {query && (
          <button
            type="button"
            className="docs-search-clear"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && query.trim() !== "" && (
        <div className="docs-search-popover">
          {filteredResults.length === 0 ? (
            <div className="docs-search-empty">
              No matching documentation pages found for "<b>{query}</b>"
            </div>
          ) : (
            <div className="docs-search-results-list">
              <div className="docs-search-results-count">
                {filteredResults.length} matching page{filteredResults.length > 1 ? "s" : ""}
              </div>
              {filteredResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="docs-search-result-item"
                  onClick={() => {
                    onSelectDoc(item.path);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="result-header">
                    <span className="result-title">{item.title}</span>
                    <span className="result-section">{item.section}</span>
                  </div>
                  <div className="result-subtitle">{item.subtitle}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon-svg">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
