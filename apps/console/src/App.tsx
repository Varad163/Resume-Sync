import { useCallback, useEffect, useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import {
  api,
  clearToken,
  currentToken,
  type GithubRepository,
  type Posture,
  type Project,
} from "./api.js";
import { Sidebar, type NavView } from "./components/Sidebar.js";
import { Topbar } from "./components/Topbar.js";
import { AddRepoModal } from "./components/AddRepoModal.js";
import { Activity } from "./pages/AuditPage.js";
import { GithubDocsPage } from "./pages/GithubDocsPage.js";
import { IntegrationsPage } from "./pages/IntegrationsPage.js";
import { IssuesPage } from "./pages/IssuesPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { Overview } from "./pages/OverviewPage.js";
import { RepositoriesPage } from "./pages/RepositoriesPage.js";
import { ScanView } from "./pages/ScanDetailPage.js";
import { ScansPage } from "./pages/ScansPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

type View =
  | { name: NavView }
  | { name: "scan"; id: string }
  | { name: "docs/github" };

function getInitialView(): View {
  if (typeof window !== "undefined") {
    const path = window.location.pathname.replace(/\/$/, "");
    if (path === "/docs/github") {
      return { name: "docs/github" };
    }
  }
  return { name: "overview" };
}

export default function App() {
  const [view, setView] = useState<View>(getInitialView);
  const [token, setAuthToken] = useState<string>(currentToken());
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<(ScanRecord & { posture?: Posture })[]>([]);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);

  const navigate = useCallback((newView: View, pushState = true) => {
    setView(newView);
    if (pushState && typeof window !== "undefined") {
      let targetPath = "/";
      if (newView.name === "docs/github") {
        targetPath = "/docs/github";
      }
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/$/, "");
      if (path === "/docs/github") {
        setView({ name: "docs/github" });
      } else {
        setView({ name: "overview" });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [{ projects: loadedProjects }, { scans: loadedScans }] = await Promise.all([
        api.projects(),
        api.scans(),
      ]);
      setProjects(loadedProjects);
      setScans(loadedScans);
    } catch (err) {
      console.warn("Failed to load project/scan data:", err);
    }
  }, [token]);

  const loadGithubRepos = useCallback(async () => {
    if (!token) return;
    try {
      const status = await api.getGithubStatus();
      if (status.connected) {
        const { repositories } = await api.getGithubRepositories();
        setGithubRepos(repositories);
      }
    } catch (err) {
      console.warn("Failed to load GitHub repositories:", err);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
    void loadGithubRepos();
    const interval = setInterval(() => void loadData(), 4000);
    return () => clearInterval(interval);
  }, [loadData, loadGithubRepos]);

  const handleLogout = () => {
    clearToken();
    setAuthToken("");
    navigate({ name: "overview" });
  };

  const handleLoginSuccess = () => {
    setAuthToken(currentToken());
    void loadData();
    void loadGithubRepos();
  };

  // If unauthenticated and accessing static docs route, render static docs directly without auth lock
  if (!token) {
    if (view.name === "docs/github") {
      return (
        <div style={{ background: "var(--bg-dark)", minHeight: "100vh", padding: "40px 20px" }}>
          <GithubDocsPage onBack={() => navigate({ name: "overview" })} />
        </div>
      );
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const project = projects[0];

  return (
    <div className="app-shell">
      <Sidebar
        currentView={view.name}
        onNavigate={(nav) => navigate({ name: nav })}
        onLogout={handleLogout}
        userName="Varad Gholap"
      />

      <div className="main-viewport">
        <Topbar userName="Varad Gholap" />

        <main className="main-content">
          {view.name === "overview" && (
            <Overview
              userName="Varad"
              onOpenScan={(id) => navigate({ name: "scan", id })}
              onOpenAddRepo={() => setIsAddRepoOpen(true)}
              onNavigateView={(nav) => {
                if (nav === "docs/github") {
                  navigate({ name: "docs/github" });
                } else {
                  navigate({ name: nav });
                }
              }}
            />
          )}

          {view.name === "repositories" && (
            <RepositoriesPage
              projects={projects}
              scans={scans}
              githubRepos={githubRepos}
              onOpenAddRepo={() => setIsAddRepoOpen(true)}
              onSelectScan={(id) => navigate({ name: "scan", id })}
            />
          )}

          {view.name === "scans" && (
            <ScansPage
              scans={scans}
              onOpenAddRepo={() => setIsAddRepoOpen(true)}
              onSelectScan={(id) => navigate({ name: "scan", id })}
            />
          )}

          {view.name === "issues" && (
            <IssuesPage
              scans={scans}
              onSelectScan={(id) => navigate({ name: "scan", id })}
            />
          )}

          {view.name === "integrations" && (
            <IntegrationsPage onNavigateDocs={() => navigate({ name: "docs/github" })} />
          )}

          {view.name === "settings" && (
            <SettingsPage projects={projects} onProjectUpdated={loadData} />
          )}

          {view.name === "audit" && <Activity />}

          {view.name === "scan" && (
            <ScanView id={view.id} onBack={() => navigate({ name: "scans" })} />
          )}

          {view.name === "docs/github" && (
            <GithubDocsPage onBack={() => navigate({ name: "overview" })} />
          )}
        </main>
      </div>

      <AddRepoModal
        isOpen={isAddRepoOpen}
        onClose={() => setIsAddRepoOpen(false)}
        project={project}
        onScanStarted={(scanId) => {
          void loadData();
          navigate({ name: "scan", id: scanId });
        }}
      />
    </div>
  );
}
