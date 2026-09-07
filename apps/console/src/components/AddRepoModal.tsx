import { useEffect, useState } from "react";
import {
  api,
  type Project,
  type GithubStatusResponse,
  type GithubRepository,
  type GithubBranch,
} from "../api.js";

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | undefined;
  onScanStarted: (scanId: string) => void;
}

export function AddRepoModal({ isOpen, onClose, project, onScanStarted }: AddRepoModalProps) {
  const [scanMode, setScanMode] = useState<"github" | "git" | "zip">("github");
  const [starting, setStarting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Manual Git state
  const [gitUrl, setGitUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");

  // ZIP upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // GitHub App state
  const [githubStatus, setGithubStatus] = useState<GithubStatusResponse | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GithubRepository | null>(null);
  const [githubBranches, setGithubBranches] = useState<GithubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [loadingGithubBranches, setLoadingGithubBranches] = useState(false);

  const loadGithubData = async () => {
    try {
      const status = await api.getGithubStatus();
      setGithubStatus(status);
      if (status.connected) {
        setLoadingGithubRepos(true);
        try {
          const { repositories } = await api.getGithubRepositories();
          setGithubRepos(repositories);
          if (repositories.length > 0 && !selectedRepo) {
            const first = repositories[0]!;
            setSelectedRepo(first);
            void fetchBranches(first.owner, first.name, first.defaultBranch);
          }
        } finally {
          setLoadingGithubRepos(false);
        }
      }
    } catch (e) {
      console.warn("GitHub status check failed:", e);
    }
  };

  const fetchBranches = async (owner: string, repoName: string, defaultBranch?: string) => {
    setLoadingGithubBranches(true);
    try {
      const { branches } = await api.getGithubBranches(owner, repoName);
      setGithubBranches(branches);
      if (branches.length > 0) {
        const foundDef = branches.find((b) => b.name === defaultBranch);
        setSelectedBranch(foundDef?.name ?? branches[0]!.name);
      } else {
        setSelectedBranch(defaultBranch || "main");
      }
    } catch (e) {
      console.warn("Failed to load branches:", e);
      setSelectedBranch(defaultBranch || "main");
    } finally {
      setLoadingGithubBranches(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadGithubData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "IRONBASTION_GITHUB_CONNECTED") {
        void loadGithubData();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!isOpen) return null;

  const handleConnectGithub = async () => {
    setModalError(null);
    try {
      const { url } = await api.connectGithub();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      window.open(url, "Connect GitHub", `width=${width},height=${height},left=${left},top=${top}`);
    } catch (cause) {
      setModalError((cause as Error).message);
    }
  };

  const getOrCreateTargetProject = async (projectName: string, target: Record<string, unknown>): Promise<Project> => {
    if (project) return project;
    try {
      const { projects } = await api.projects();
      const existing = projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase());
      if (existing) return existing;
    } catch (e) {
      console.warn("Project list lookup error:", e);
    }
    const { project: created } = await api.createProject(projectName, [target]);
    return created;
  };

  const runGithubScan = async () => {
    if (!selectedRepo) return;
    setStarting(true);
    setModalError(null);
    try {
      const target = {
        kind: "git-repository" as const,
        id: `target_gh_${Date.now()}`,
        name: selectedRepo.fullName,
        remoteUrl: selectedRepo.cloneUrl || `https://github.com/${selectedRepo.owner}/${selectedRepo.name}.git`,
        ref: selectedBranch || selectedRepo.defaultBranch || "main",
        provider: "github",
        githubRepositoryId: selectedRepo.id,
        githubOwner: selectedRepo.owner,
        githubRepo: selectedRepo.name,
      };

      const targetProject = await getOrCreateTargetProject(selectedRepo.name, target);
      await api.updateProject(targetProject.id, targetProject.name, [target]);
      const { scan } = await api.startScan(targetProject.id);
      onClose();
      onScanStarted(scan.id);
    } catch (cause) {
      console.error("Scan start error:", cause);
      setModalError("Unable to start the scan. Something went wrong while preparing your repository. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const runGitScan = async () => {
    if (!gitUrl.trim()) {
      setModalError("Please enter a valid Git repository URL.");
      return;
    }
    setStarting(true);
    setModalError(null);
    try {
      const repoName = gitUrl.split("/").pop()?.replace(/\.git$/, "") || "git-repo";
      const target = {
        kind: "git-repository" as const,
        id: `target_git_${Date.now()}`,
        name: repoName,
        remoteUrl: gitUrl.trim(),
        ref: gitBranch.trim() || "main",
      };

      const targetProject = await getOrCreateTargetProject(repoName, target);
      await api.updateProject(targetProject.id, targetProject.name, [target]);
      const { scan } = await api.startScan(targetProject.id);
      onClose();
      onScanStarted(scan.id);
    } catch (cause) {
      console.error("Manual Git scan error:", cause);
      setModalError("Unable to start the scan. Something went wrong while preparing your repository. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setModalError("Only .zip files are supported.");
      setSelectedFile(null);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setModalError("ZIP file exceeds maximum upload size (50MB).");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const runZipScan = async () => {
    if (!selectedFile) return;
    setStarting(true);
    setModalError(null);
    try {
      const projName = selectedFile.name.replace(/\.zip$/i, "") || "zip-project";
      const targetProject = await getOrCreateTargetProject(projName, { kind: "zip-archive", name: selectedFile.name });
      const { scan } = await api.uploadZipScan(targetProject.id, selectedFile);
      onClose();
      onScanStarted(scan.id);
    } catch (cause) {
      console.error("ZIP scan error:", cause);
      setModalError("Unable to start the scan. Something went wrong while uploading your ZIP archive. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const filteredGithubRepos = githubRepos.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Add Repository</h3>
            <p className="modal-subtitle">Choose a GitHub repository to scan for cryptographic vulnerabilities.</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} disabled={starting}>
            ✕
          </button>
        </div>

        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${scanMode === "github" ? "active" : ""}`}
            onClick={() => setScanMode("github")}
            disabled={starting}
          >
            <GithubIcon /> GitHub Repositories
          </button>
          <button
            type="button"
            className={`modal-tab ${scanMode === "git" ? "active" : ""}`}
            onClick={() => setScanMode("git")}
            disabled={starting}
          >
            <GitIcon /> Manual Git URL
          </button>
          <button
            type="button"
            className={`modal-tab ${scanMode === "zip" ? "active" : ""}`}
            onClick={() => setScanMode("zip")}
            disabled={starting}
          >
            <ZipIcon /> Upload ZIP
          </button>
        </div>

        {modalError && (
          <div className="banner alert-error" style={{ marginBottom: 16 }}>
            <b>Error: </b>
            {modalError}
          </div>
        )}

        {scanMode === "github" ? (
          <div className="tab-content">
            {!githubStatus?.configured ? (
              <div className="banner alert-warning">
                <b>GitHub App Not Configured</b>
                The GitHub App integration is missing server credentials.
              </div>
            ) : !githubStatus.connected ? (
              <div className="github-connect-box">
                <GithubIcon size={36} />
                <p>Connect your GitHub account to import and scan your repositories directly.</p>
                <button type="button" className="btn primary" onClick={handleConnectGithub}>
                  Connect GitHub Account
                </button>
              </div>
            ) : (
              <div className="form-group-stack">
                <div className="github-connected-badge" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "0.875rem", color: "#10b981" }}>
                  <span className="dot green" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                  Connected as <b>@{githubStatus.installation?.accountLogin}</b>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "0.875rem", color: "#cbd5e1" }}>
                    Select Repository
                  </label>
                  {loadingGithubRepos ? (
                    <div className="loading-text" style={{ padding: "12px", color: "#94a3b8", fontSize: "0.875rem" }}>
                      Loading your repositories…
                    </div>
                  ) : githubRepos.length === 0 ? (
                    <div className="empty-text" style={{ padding: "12px", color: "#94a3b8", fontSize: "0.875rem" }}>
                      No repositories found. If you believe you should have access to a repository, check your GitHub permissions.
                    </div>
                  ) : (
                    <>
                      <div className="repo-search-wrapper" style={{ marginBottom: 10 }}>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="Search repositories..."
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          disabled={starting}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }}
                        />
                      </div>

                      <div className="repo-selection-list" style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                        {filteredGithubRepos.map((repo) => {
                          const isSelected = selectedRepo?.id === repo.id;
                          return (
                            <div
                              key={repo.id}
                              className={`repo-selection-card ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                if (starting) return;
                                setSelectedRepo(repo);
                                void fetchBranches(repo.owner, repo.name, repo.defaultBranch);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                borderRadius: 6,
                                border: isSelected ? "1px solid #6366f1" : "1px solid #334155",
                                background: isSelected ? "rgba(99, 102, 241, 0.12)" : "#1e293b",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: isSelected ? "#818cf8" : "#64748b", fontWeight: "bold" }}>
                                  {isSelected ? "✓" : "○"}
                                </span>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#f8fafc" }}>{repo.name}</div>
                                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{repo.fullName}</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, background: "#334155", color: "#cbd5e1" }}>
                                  {repo.private ? "Private" : "Public"}
                                </span>
                                <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "monospace" }}>
                                  {repo.defaultBranch}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {selectedRepo && (
                  <div className="form-group">
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "0.875rem", color: "#cbd5e1" }}>
                      Target Branch / Ref
                    </label>
                    {loadingGithubBranches ? (
                      <div className="loading-text" style={{ padding: "8px", color: "#94a3b8", fontSize: "0.875rem" }}>
                        Loading branches…
                      </div>
                    ) : (
                      <select
                        className="select-input"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        disabled={starting}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }}
                      >
                        {githubBranches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name} {b.isDefault ? "(default)" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                  <button type="button" className="btn ghost" onClick={onClose} disabled={starting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={runGithubScan}
                    disabled={starting || !selectedRepo}
                  >
                    {starting ? "Starting Scan…" : "Start Security Scan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : scanMode === "git" ? (
          <div className="tab-content">
            <div className="form-group-stack">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "0.875rem", color: "#cbd5e1" }}>
                  Repository URL
                </label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="https://github.com/org/repository.git"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  disabled={starting}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "0.875rem", color: "#cbd5e1" }}>
                  Target Branch / Ref
                </label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="main"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  disabled={starting}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }}
                />
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" className="btn ghost" onClick={onClose} disabled={starting}>
                  Cancel
                </button>
                <button type="button" className="btn primary" onClick={runGitScan} disabled={starting || !gitUrl.trim()}>
                  {starting ? "Starting Scan…" : "Start Security Scan"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="tab-content">
            <div className="form-group-stack">
              <div className="zip-upload-dropzone" style={{ marginBottom: 16 }}>
                <input
                  type="file"
                  id="zip-input"
                  accept=".zip"
                  onChange={handleFileChange}
                  disabled={starting}
                  style={{ display: "none" }}
                />
                <label htmlFor="zip-input" className="dropzone-label" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", border: "2px dashed #334155", borderRadius: 8, cursor: "pointer", background: "#0f172a" }}>
                  <ZipIcon size={32} />
                  <span style={{ marginTop: 8, fontSize: "0.875rem", color: "#f8fafc" }}>{selectedFile ? selectedFile.name : "Click or drag a .zip file here to upload"}</span>
                  <span className="sub" style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>Maximum size: 50MB</span>
                </label>
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" className="btn ghost" onClick={onClose} disabled={starting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={runZipScan}
                  disabled={starting || !selectedFile}
                >
                  {starting ? "Uploading & Scanning…" : "Upload and Start Scan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GitIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
  );
}

function ZipIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  );
}
