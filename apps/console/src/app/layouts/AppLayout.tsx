import type { ReactNode } from "react";
import type { ScanRecord } from "@ironbastion/core";
import type { Posture, Project } from "../../api.js";
import { Sidebar, type NavView } from "../../components/Sidebar.js";
import { Topbar } from "../../components/Topbar.js";

export interface AppLayoutProps {
  currentView: NavView | string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  workspaceId?: string;
  scans?: (ScanRecord & { posture?: Posture })[];
  projects?: Project[];
  children: ReactNode;
}

export function AppLayout({
  currentView,
  onNavigate,
  onLogout,
  userName = "Varad Gholap",
  userRole = "Security Lead",
  workspaceId = "tnt_demo",
  scans = [],
  children,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar
        currentView={currentView}
        onNavigate={(nav) => onNavigate(nav)}
        onLogout={onLogout}
        userName={userName}
      />

      <div className="main-viewport">
        <Topbar
          userName={userName}
          userRole={userRole}
          workspaceId={workspaceId}
          scans={scans}
          onNavigate={(targetView) => onNavigate(targetView)}
          onLogout={onLogout}
        />

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
