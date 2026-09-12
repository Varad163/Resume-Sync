import { useState } from "react";

export type NavView = "overview" | "repositories" | "scans" | "issues" | "cbom" | "certify" | "integrations" | "docs" | "settings" | "audit";

interface SidebarProps {
  currentView: NavView | string;
  onNavigate: (view: NavView) => void;
  onLogout: () => void;
  userName?: string;
}

export function Sidebar({ currentView, onNavigate, onLogout, userName = "Varad Gholap" }: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems: { id: NavView; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Dashboard", icon: <DashboardIcon /> },
    { id: "repositories", label: "Repositories", icon: <RepoIcon /> },
    { id: "scans", label: "Scans", icon: <ScansIcon /> },
    { id: "issues", label: "Issues", icon: <IssuesIcon /> },
    { id: "cbom", label: "CBOM", icon: <CbomIcon /> },
    { id: "certify", label: "Certify", icon: <CertifyIcon /> },
    { id: "integrations", label: "Integrations", icon: <IntegrationsIcon /> },
    { id: "docs", label: "Documentation", icon: <DocsIcon /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => onNavigate("overview")}>
        <div className="shield-logo">
          <ShieldIcon />
        </div>
        <div className="brand-text">
          <span className="brand-name">IronBastion</span>
          <span className="brand-tagline">Secure Code. Stronger Tomorrow.</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = currentView === item.id || (currentView === "scan" && item.id === "scans");
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section: Pro upgrade + User Profile */}
      <div className="sidebar-footer">
        <div className="upgrade-card">
          <div className="upgrade-header">
            <CrownIcon />
            <span>Upgrade to Pro</span>
          </div>
          <p className="upgrade-text">Unlock advanced scans, team collaboration and more.</p>
          <button type="button" className="upgrade-btn">
            Upgrade
          </button>
        </div>

        <div className="user-profile-menu">
          <button
            type="button"
            className="user-profile-bar"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="user-avatar">VG</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">Security Lead</div>
            </div>
            <ChevronDownIcon size={14} />
          </button>

          {userMenuOpen && (
            <div className="user-dropdown">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate("settings");
                }}
              >
                Settings & API
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate("audit");
                }}
              >
                Audit Activity Log
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-critical"
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 7V12C3 17.55 7 21.74 12 23C17 21.74 21 17.55 21 12V7L12 2Z"
        fill="url(#shield-grad)"
        stroke="#3B82F6"
        strokeWidth="1.5"
      />
      <path d="M12 6L16 9.5V13.5L12 17.5L8 13.5V9.5L12 6Z" fill="#3B82F6" opacity="0.4" />
      <defs>
        <linearGradient id="shield-grad" x1="12" y1="2" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function ScansIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IssuesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IntegrationsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
      <path d="M2 4l3 12h14l3-12-6 7-4-5-4 5-6-7z" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CbomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function CertifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function DocsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
    </svg>
  );
}
