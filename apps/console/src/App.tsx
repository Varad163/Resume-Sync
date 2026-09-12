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
import type { NavView } from "./components/Sidebar.js";
import { AppLayout } from "./app/layouts/AppLayout.js";
import { formatPath, parsePath, type RouteDef } from "./app/routes.js";
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
import { DocsLayout } from "./docs/DocsLayout.js";
import { DocsPageRenderer } from "./docs/DocsPageRenderer.js";

function getInitialRoute(): RouteDef {
  if (typeof window !== "undefined") {
    return parsePath(window.location.pathname);
  }
  return { name: "overview" };
}

export default function App() {
  const [route, setRoute] = useState<RouteDef>(getInitialRoute);
  const [token, setAuthToken] = useState<string>(currentToken());
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<(ScanRecord & { posture?: Posture })[]>([]);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);

  const navigate = useCallback((newRoute: RouteDef, pushState = true) => {
    setRoute(newRoute);
    if (pushState && typeof window !== "undefined") {
      const targetPath = formatPath(newRoute);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        setRoute(parsePath(window.location.pathname));
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
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "IRONBASTION_GITHUB_CONNECTED") {
        void loadGithubRepos();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("message", handleMessage);
    };
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

  // Render static/interactive docs layout for /docs routes
  if (route.name === "docs") {
    return (
      <DocsLayout
        currentPath={route.path}
        onNavigateDoc={(path) => navigate({ name: "docs", path })}
        onBackToConsole={() => navigate({ name: "overview" })}
      >
        <DocsPageRenderer
          currentPath={route.path}
          onNavigate={(path) => navigate({ name: "docs", path })}
        />
      </DocsLayout>
    );
  }

  // If unauthenticated and accessing static docs route, render static docs directly without auth lock
  if (!token) {
    if (route.name === "docs/github") {
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
    <AppLayout
      currentView={route.name}
      onNavigate={(target) => {
        if (target === "docs") {
          navigate({ name: "docs", path: "/docs" });
        } else if (target === "docs/github") {
          navigate({ name: "docs", path: "/docs/integrations/github-app" });
        } else if (target === "settings") {
          navigate({ name: "settings" });
        } else if (target === "scans") {
          navigate({ name: "scans" });
        } else if (target === "overview") {
          navigate({ name: "overview" });
        } else {
          navigate({ name: target as Exclude<NavView, "docs"> });
        }
      }}
      onLogout={handleLogout}
      userName="Varad Gholap"
      userRole="Security Lead"
      workspaceId={project?.tenantId || "tnt_demo"}
      scans={scans}
      projects={projects}
    >
      {route.name === "overview" && (
        <Overview
          userName="Varad"
          onOpenScan={(id) => navigate({ name: "scan", id })}
          onOpenAddRepo={() => setIsAddRepoOpen(true)}
          onNavigateView={(nav) => {
            if (nav === "docs/github") {
              navigate({ name: "docs", path: "/docs/integrations/github-app" });
            } else {
              navigate({ name: nav as Exclude<NavView, "docs"> });
            }
          }}
        />
      )}

      {route.name === "repositories" && (
        <RepositoriesPage
          projects={projects}
          scans={scans}
          githubRepos={githubRepos}
          onOpenAddRepo={() => setIsAddRepoOpen(true)}
          onSelectScan={(id) => navigate({ name: "scan", id })}
        />
      )}

      {route.name === "scans" && (
        <ScansPage
          scans={scans}
          onOpenAddRepo={() => setIsAddRepoOpen(true)}
          onSelectScan={(id) => navigate({ name: "scan", id })}
        />
      )}

      {route.name === "issues" && (
        <IssuesPage
          scans={scans}
          onSelectScan={(id) => navigate({ name: "scan", id })}
        />
      )}

      {route.name === "integrations" && (
        <IntegrationsPage onNavigateDocs={() => navigate({ name: "docs/github" })} />
      )}

      {route.name === "settings" && (
        <SettingsPage projects={projects} onProjectUpdated={loadData} />
      )}

      {route.name === "audit" && <Activity />}

      {route.name === "certify" &&
        (scans.length > 0 ? (
          <ScanView
            id={(scans.find((s) => s.status === "succeeded") || scans[0])!.id}
            initialTab="certify"
            onBack={() => navigate({ name: "scans" })}
          />
        ) : (
          <ScansPage
            scans={scans}
            onOpenAddRepo={() => setIsAddRepoOpen(true)}
            onSelectScan={(id) => navigate({ name: "scan", id })}
          />
        ))}

      {route.name === "cbom" &&
        (scans.length > 0 ? (
          <ScanView
            id={(scans.find((s) => s.status === "succeeded") || scans[0])!.id}
            initialTab="cbom"
            onBack={() => navigate({ name: "scans" })}
          />
        ) : (
          <ScansPage
            scans={scans}
            onOpenAddRepo={() => setIsAddRepoOpen(true)}
            onSelectScan={(id) => navigate({ name: "scan", id })}
          />
        ))}

      {route.name === "scan" && (
        <ScanView
          id={route.id}
          initialTab={route.initialTab}
          onBack={() => navigate({ name: "scans" })}
        />
      )}

      {route.name === "docs/github" && (
        <GithubDocsPage onBack={() => navigate({ name: "overview" })} />
      )}

      <AddRepoModal
        isOpen={isAddRepoOpen}
        onClose={() => setIsAddRepoOpen(false)}
        project={project}
        onScanStarted={(scanId) => {
          void loadData();
          navigate({ name: "scan", id: scanId });
        }}
      />
    </AppLayout>
  );
}
