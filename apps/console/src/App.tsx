/**
 * The console.
 *
 * Three views, because a scan produces three things a customer acts on: the
 * findings, the inventory, and the plan. Everything else is provenance, and it
 * sits next to the thing it explains rather than in a separate audit screen
 * nobody opens.
 */

import { useState } from "react";
import { clearToken, currentToken } from "./api.js";
import { Activity } from "./pages/AuditPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { Overview } from "./pages/OverviewPage.js";
import { ScanView } from "./pages/ScanDetailPage.js";

type View = { name: "overview" } | { name: "scan"; id: string } | { name: "audit" };

export default function App() {
  const [view, setView] = useState<View>({ name: "overview" });
  const [token, setAuthToken] = useState<string>(currentToken());

  const handleLogout = () => {
    clearToken();
    setAuthToken("");
    setView({ name: "overview" });
  };

  const handleLoginSuccess = () => {
    setAuthToken(currentToken());
  };

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">
          <Mark />
          <b>
            Iron<span>bastion</span>
          </b>
        </div>
        <nav>
          <button
            type="button"
            className="navitem"
            aria-current={view.name === "overview" ? "page" : undefined}
            onClick={() => setView({ name: "overview" })}
          >
            Scans
          </button>
          <button
            type="button"
            className="navitem"
            aria-current={view.name === "audit" ? "page" : undefined}
            onClick={() => setView({ name: "audit" })}
          >
            Activity
          </button>
        </nav>
        <div className="foot">
          <div className="label">Console</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--tick)", marginTop: 6 }}>
            v0.1.0
          </div>

          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Session: <span style={{ color: "var(--quantum)" }}>Active</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "var(--critical)",
                fontSize: 11,
                padding: 0,
                marginTop: 4,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear Session / Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        {view.name === "overview" ? (
          <Overview onOpen={(id) => setView({ name: "scan", id })} />
        ) : view.name === "scan" ? (
          <ScanView id={view.id} onBack={() => setView({ name: "overview" })} />
        ) : (
          <Activity />
        )}
      </main>
    </div>
  );
}

function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.2 L18.8 7 L18.8 13 L12 20.6 L5.2 13 L5.2 7 Z"
        fill="none"
        stroke="var(--quantum)"
        strokeWidth="1.6"
      />
    </svg>
  );
}
