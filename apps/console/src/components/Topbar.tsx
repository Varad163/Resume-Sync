import { useEffect, useMemo, useRef, useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import type { Posture } from "../api.js";

interface NotificationItem {
  id: string;
  type: "critical" | "warning" | "success" | "info";
  title: string;
  description: string;
  timestamp: string;
  scanId?: string;
}

interface TopbarProps {
  onSearch?: (query: string) => void;
  userName?: string;
  userRole?: string;
  workspaceId?: string;
  scans?: (ScanRecord & { posture?: Posture })[];
  onNavigate?: (view: string) => void;
  onLogout?: () => void;
}

export function Topbar({
  onSearch,
  userName = "Varad Gholap",
  userRole = "Security Lead",
  workspaceId = "tnt_demo",
  scans = [],
  onNavigate,
  onLogout,
}: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const userInitials =
    userName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "VG";

  // Derive real security-relevant notifications from actual scan records
  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];
    for (const s of scans) {
      const timeStr = formatTimeAgo(s.startedAt);

      if (s.posture?.counts?.critical && s.posture.counts.critical > 0) {
        items.push({
          id: `crit-${s.id}`,
          type: "critical",
          title: "Critical vulnerability discovered",
          description: `${s.posture.counts.critical} critical findings detected in scan`,
          timestamp: timeStr,
          scanId: s.id,
        });
      }

      if (s.posture?.counts?.high && s.posture.counts.high > 0) {
        items.push({
          id: `high-${s.id}`,
          type: "warning",
          title: "High-risk cryptographic asset detected",
          description: `${s.posture.counts.high} high-risk cryptographic issues detected`,
          timestamp: timeStr,
          scanId: s.id,
        });
      }

      if (s.status === "succeeded") {
        items.push({
          id: `complete-${s.id}`,
          type: "success",
          title: "Scan completed",
          description: `Security analysis completed for scan ${s.id.slice(0, 16)}...`,
          timestamp: timeStr,
          scanId: s.id,
        });
      } else if (s.status === "failed") {
        items.push({
          id: `failed-${s.id}`,
          type: "critical",
          title: "Scan failed",
          description: `Security scan encountered an error`,
          timestamp: timeStr,
          scanId: s.id,
        });
      }
    }
    return items;
  }, [scans]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setReadIds((prev) => new Set(prev).add(item.id));
    setNotificationsOpen(false);
    if (onNavigate) {
      if (item.scanId) {
        onNavigate("scans");
      } else {
        onNavigate("scans");
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <SearchIcon />
        <input
          type="text"
          className="search-input"
          placeholder="Search repositories, scans, issues..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="topbar-right" ref={containerRef}>
        {/* Notification Bell Button */}
        <button
          type="button"
          className="icon-btn notification-btn"
          title="Notifications"
          aria-expanded={notificationsOpen}
          aria-label="Notifications"
          onClick={() => {
            setNotificationsOpen(!notificationsOpen);
            setProfileOpen(false);
          }}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="notification-badge-count">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Popover Dropdown */}
        {notificationsOpen && (
          <div className="notification-popover" role="menu">
            <div className="notification-popover-header">
              <span className="popover-title">Notifications</span>
              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  type="button"
                  className="mark-all-read-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <div className="empty-bell-icon">🔔</div>
                  <div className="empty-title">No new notifications</div>
                  <div className="empty-sub">Security events and scan updates will appear here.</div>
                </div>
              ) : (
                notifications.map((n) => {
                  const isRead = readIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`notification-item ${isRead ? "read" : "unread"}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="notif-type-icon">
                        {n.type === "critical" ? "🔴" : n.type === "warning" ? "🟠" : "🟢"}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-desc">{n.description}</div>
                        <div className="notif-time">{n.timestamp}</div>
                      </div>
                      {!isRead && <div className="unread-dot" />}
                    </div>
                  );
                })
              )}
            </div>

            {onNavigate && notifications.length > 0 && (
              <div className="notification-popover-footer">
                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() => {
                    setNotificationsOpen(false);
                    onNavigate("scans");
                  }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Avatar Button */}
        <div
          className="topbar-user-avatar"
          title={userName}
          role="button"
          tabIndex={0}
          aria-expanded={profileOpen}
          aria-label="User Profile Menu"
          onClick={() => {
            setProfileOpen(!profileOpen);
            setNotificationsOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }
          }}
        >
          {userInitials}
        </div>

        {/* Profile Popover Dropdown */}
        {profileOpen && (
          <div className="profile-popover" role="menu">
            <div className="profile-popover-header">
              <div className="popover-avatar">{userInitials}</div>
              <div className="popover-user-meta">
                <div className="popover-user-name">{userName}</div>
                <div className="popover-user-role">{userRole}</div>
              </div>
            </div>

            <div className="popover-divider" />

            <div className="popover-workspace-section">
              <div className="popover-section-label">Workspace</div>
              <div className="popover-workspace-val font-mono">{workspaceId}</div>
            </div>

            <div className="popover-divider" />

            <div className="popover-menu-list">
              <button
                type="button"
                className="popover-menu-item"
                onClick={() => {
                  setProfileOpen(false);
                  onNavigate?.("settings");
                }}
              >
                <span className="popover-menu-icon">⚙</span>
                <span>Settings</span>
              </button>

              <button
                type="button"
                className="popover-menu-item"
                onClick={() => {
                  setProfileOpen(false);
                  onNavigate?.("docs/github");
                }}
              >
                <span className="popover-menu-icon">📚</span>
                <span>Documentation</span>
              </button>
            </div>

            <div className="popover-divider" />

            <div className="popover-menu-list">
              <button
                type="button"
                className="popover-menu-item logout"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout?.();
                }}
              >
                <span className="popover-menu-icon">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const now = new Date().getTime();
    const past = new Date(dateStr).getTime();
    const diffMs = now - past;
    if (isNaN(diffMs) || diffMs < 0) return "Just now";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function SearchIcon() {
  return (
    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
