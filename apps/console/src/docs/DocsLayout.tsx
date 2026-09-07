import { useState } from "react";
import { DOC_SECTIONS, getDocPageByPath, getPrevAndNextPages } from "./docsIndex.js";
import { DocsSearch } from "./DocsSearch.js";

interface DocsLayoutProps {
  currentPath: string;
  onNavigateDoc: (path: string) => void;
  onBackToConsole: () => void;
  children: React.ReactNode;
}

export function DocsLayout({
  currentPath,
  onNavigateDoc,
  onBackToConsole,
  children,
}: DocsLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const currentPage = getDocPageByPath(currentPath);
  const { prev, next } = getPrevAndNextPages(currentPath);

  return (
    <div className="docs-shell">
      {/* Docs Top Bar Header */}
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle Navigation Menu"
          >
            ☰
          </button>

          <div className="docs-brand" onClick={() => onNavigateDoc("/docs")}>
            <div className="docs-shield-logo">
              <ShieldIcon />
            </div>
            <div className="docs-brand-titles">
              <span className="docs-brand-name">IronBastion</span>
              <span className="docs-brand-tag">Docs</span>
            </div>
          </div>
        </div>

        <div className="docs-topbar-center">
          <DocsSearch onSelectDoc={onNavigateDoc} />
        </div>

        <div className="docs-topbar-right">
          <button type="button" className="btn ghost sm" onClick={onBackToConsole}>
            ← Back to Console
          </button>
        </div>
      </header>

      {/* Docs Viewport: Sidebar + Main Content */}
      <div className="docs-viewport">
        {/* Left Sidebar */}
        <aside className={`docs-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
          <nav className="docs-sidebar-nav">
            {DOC_SECTIONS.map((section) => (
              <div key={section.title} className="docs-sidebar-section">
                <div className="docs-section-heading">{section.title}</div>
                <div className="docs-section-links">
                  {section.items.map((item) => {
                    const isActive = currentPath.replace(/\/$/, "") === item.path.replace(/\/$/, "");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`docs-nav-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          onNavigateDoc(item.path);
                          setMobileSidebarOpen(false);
                        }}
                      >
                        <span className="nav-bullet">›</span>
                        <span className="nav-text">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            className="docs-sidebar-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Main Documentation Article Content Area */}
        <main className="docs-content-wrapper">
          <article className="docs-article">
            {currentPage && (
              <header className="docs-article-header">
                <div className="docs-breadcrumbs">
                  <span>Documentation</span>
                  <span className="sep">/</span>
                  <span className="sec">{currentPage.section}</span>
                </div>
                <h1 className="docs-title">{currentPage.title}</h1>
                <p className="docs-subtitle">{currentPage.subtitle}</p>
              </header>
            )}

            <div className="docs-article-body">{children}</div>

            {/* Bottom Pagination Footer (Prev / Next links) */}
            <footer className="docs-pagination-footer">
              {prev ? (
                <button
                  type="button"
                  className="docs-page-btn prev"
                  onClick={() => onNavigateDoc(prev.path)}
                >
                  <span className="direction">← Previous Page</span>
                  <span className="page-name">{prev.title}</span>
                </button>
              ) : (
                <div />
              )}

              {next ? (
                <button
                  type="button"
                  className="docs-page-btn next"
                  onClick={() => onNavigateDoc(next.path)}
                >
                  <span className="direction">Next Page →</span>
                  <span className="page-name">{next.title}</span>
                </button>
              ) : (
                <div />
              )}
            </footer>
          </article>
        </main>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 7V12C3 17.55 7 21.74 12 23C17 21.74 21 17.55 21 12V7L12 2Z"
        fill="url(#shield-grad-docs)"
        stroke="#3B82F6"
        strokeWidth="1.5"
      />
      <path d="M12 6L16 9.5V13.5L12 17.5L8 13.5V9.5L12 6Z" fill="#3B82F6" opacity="0.4" />
      <defs>
        <linearGradient id="shield-grad-docs" x1="12" y1="2" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
