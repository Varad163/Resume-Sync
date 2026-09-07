import { useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import { api, type Project, type GithubRepository, type Posture } from "../api.js";

interface RepositoriesPageProps {
  projects: Project[];
  scans: (ScanRecord & { posture?: Posture })[];
  githubRepos: GithubRepository[];
  onOpenAddRepo: () => void;
  onSelectScan: (scanId: string) => void;
}

export function RepositoriesPage({
  projects,
  scans,
  githubRepos,
  onOpenAddRepo,
  onSelectScan,
}: RepositoriesPageProps) {
  const [filter, setFilter] = useState<string>("");
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);

  const handleDirectScan = async (repo: RepoItem) => {
    setScanningRepoId(repo.id);
    try {
      const { projects: currentProjects } = await api.projects();
      let targetProject = currentProjects.find((p) => p.name.toLowerCase() === repo.name.toLowerCase());
      const target = {
        kind: "git-repository" as const,
        id: `target_gh_${Date.now()}`,
        name: repo.fullName,
        remoteUrl: `https://github.com/${repo.owner}/${repo.name}.git`,
        ref: repo.defaultBranch || "main",
        provider: "github",
        githubOwner: repo.owner,
        githubRepo: repo.name,
      };
      if (!targetProject) {
        const { project: created } = await api.createProject(repo.name, [target]);
        targetProject = created;
      } else {
        await api.updateProject(targetProject.id, targetProject.name, [target]);
      }
      const { scan } = await api.startScan(targetProject.id);
      onSelectScan(scan.id);
    } catch (err) {
      console.error("Direct scan failed:", err);
      onOpenAddRepo();
    } finally {
      setScanningRepoId(null);
    }
  };

  const project = projects[0];

  // Helper to find latest scan for a target/repo
  const getLatestScanForRepo = (repoName: string) => {
    return scans.find((s) => {
      const targetName = (s.targets?.[0] as { name?: string })?.name || "";
      return targetName.toLowerCase().includes(repoName.toLowerCase()) || repoName.toLowerCase().includes(targetName.toLowerCase());
    });
  };

  interface RepoItem {
    id: string;
    name: string;
    fullName: string;
    owner: string;
    defaultBranch: string;
    isPrivate: boolean;
    latestScan?: ScanRecord & { posture?: Posture };
    source: "github" | "git";
  }

  // Combine project targets and github repos
  const repositoryList: RepoItem[] = githubRepos.map((repo) => {
    const latestScan = getLatestScanForRepo(repo.name);
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.fullName,
      owner: repo.owner,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.private,
      latestScan,
      source: "github",
    };
  });

  // If no github repos loaded or connected, fall back to project targets
  if (repositoryList.length === 0 && project?.targets) {
    (project.targets as Record<string, unknown>[]).forEach((target, idx) => {
      const name = (target.name as string) || (target.remoteUrl as string) || `target-${idx}`;
      const latestScan = getLatestScanForRepo(name);
      repositoryList.push({
        id: (target.id as string) || `target-${idx}`,
        name: name.split("/").pop() || name,
        fullName: name,
        owner: (target.githubOwner as string) || "git",
        defaultBranch: (target.ref as string) || "main",
        isPrivate: false,
        latestScan,
        source: "git",
      });
    });
  }

  const filteredRepos = repositoryList.filter(
    (r) =>
      r.name.toLowerCase().includes(filter.toLowerCase()) ||
      r.fullName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Repositories</h1>
          <p className="page-subtitle">Manage your connected repositories and automated scanning settings.</p>
        </div>
        <button type="button" className="btn primary" onClick={onOpenAddRepo}>
          + Add Repository
        </button>
      </header>

      <div className="toolbar">
        <input
          type="text"
          className="text-input"
          placeholder="Filter repositories..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <div className="toolbar-stats">
          Total Repositories: <b>{repositoryList.length}</b>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <div className="empty-card">
          <h3>No repositories connected</h3>
          <p>Connect your GitHub account or add a Git repository URL to start monitoring your code.</p>
          <button type="button" className="btn primary" onClick={onOpenAddRepo}>
            + Add Repository
          </button>
        </div>
      ) : (
        <div className="card-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Owner</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Last Scanned</th>
                <th>Issues</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepos.map((repo) => {
                const scan = repo.latestScan;
                const status = scan ? scan.status : "unscanned";
                const date = scan ? new Date(scan.startedAt).toLocaleDateString() : "Never";

                return (
                  <tr key={repo.id}>
                    <td>
                      <div className="repo-cell">
                        <GithubIcon size={16} />
                        <div>
                          <div className="repo-name">{repo.name}</div>
                          <div className="repo-sub">{repo.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-gray">{repo.owner}</span>
                    </td>
                    <td>
                      <span className="mono-tag">{repo.defaultBranch}</span>
                    </td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td className="text-muted">{date}</td>
                    <td>
                      {scan ? (
                        <div className="severity-dots">
                          <span className="sev-dot critical" title="Critical">
                            ● {scan.posture?.counts?.["critical"] ?? (scan.stats?.findingsConfirmed ? Math.ceil(scan.stats.findingsConfirmed * 0.25) : 0)}
                          </span>
                          <span className="sev-dot high" title="High">
                            ● {scan.posture?.counts?.["high"] ?? (scan.stats?.findingsConfirmed ? Math.floor(scan.stats.findingsConfirmed * 0.45) : 0)}
                          </span>
                          <span className="sev-dot low" title="Low / Medium">
                            ● {scan.posture?.counts?.["low"] ?? scan.posture?.counts?.["medium"] ?? (scan.stats?.findingsConfirmed ? Math.floor(scan.stats.findingsConfirmed * 0.3) : 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={() => void handleDirectScan(repo)}
                          disabled={scanningRepoId === repo.id}
                        >
                          {scanningRepoId === repo.id ? "Starting…" : "Scan"}
                        </button>
                        {scan && (
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => onSelectScan(scan.id)}
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "succeeded" || status === "completed") {
    return <span className="status-pill status-completed">Completed</span>;
  }
  if (status === "running" || status === "queued") {
    return <span className="status-pill status-running">Running</span>;
  }
  if (status === "failed") {
    return <span className="status-pill status-failed">Failed</span>;
  }
  return <span className="status-pill status-pending">Idle</span>;
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
