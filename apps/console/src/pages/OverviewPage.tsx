import { useCallback, useEffect, useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import {
  api,
  type Project,
  type GithubStatusResponse,
  type GithubRepository,
  type GithubBranch,
} from "../api.js";
import { Empty, Readout } from "../components.js";

const SEVERITY_TONE: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--legacy)",
  medium: "var(--legacy)",
  low: "var(--quantum)",
  informational: "var(--dim)",
};

export function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<(ScanRecord & { posture?: { overall: number; severity: string } })[]>([]);
  const [error, setError] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [scanMode, setScanMode] = useState<"github" | "git" | "zip">("github");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // GitHub App state
  const [githubStatus, setGithubStatus] = useState<GithubStatusResponse | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepository | null>(null);
  const [githubBranches, setGithubBranches] = useState<GithubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [loadingGithubBranches, setLoadingGithubBranches] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ projects: loadedProjects }, { scans: loadedScans }] = await Promise.all([
        api.projects(),
        api.scans(),
      ]);
      setProjects(loadedProjects);
      setScans(loadedScans);
      setError(undefined);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  const loadGithubData = useCallback(async () => {
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
  }, [selectedRepo]);

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
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (showModal && scanMode === "github") {
      void loadGithubData();
    }
  }, [showModal, scanMode, loadGithubData]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "IRONBASTION_GITHUB_CONNECTED") {
        void loadGithubData();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadGithubData]);

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

  const handleDisconnectGithub = async () => {
    setModalError(null);
    try {
      await api.disconnectGithub();
      setGithubStatus(null);
      setGithubRepos([]);
      setSelectedRepo(null);
      setGithubBranches([]);
      setSelectedBranch("");
      await loadGithubData();
    } catch (cause) {
      setModalError((cause as Error).message);
    }
  };

  const handleRepoSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoId = Number.parseInt(e.target.value, 10);
    const found = githubRepos.find((r) => r.id === repoId) ?? null;
    setSelectedRepo(found);
    if (found) {
      void fetchBranches(found.owner, found.name, found.defaultBranch);
    }
  };

  const runGithubScan = async () => {
    const project = projects[0];
    if (!project || !selectedRepo) return;
    setStarting(true);
    setModalError(null);
    try {
      // Update project targets with selected GitHub repository target
      const target = {
        kind: "git-repository" as const,
        id: `target_gh_${Date.now()}`,
        name: selectedRepo.fullName,
        remoteUrl: selectedRepo.cloneUrl || `https://github.com/${selectedRepo.owner}/${selectedRepo.name}.git`,
        ref: selectedBranch || selectedRepo.defaultBranch,
        provider: "github",
        githubRepositoryId: selectedRepo.id,
        githubOwner: selectedRepo.owner,
        githubRepo: selectedRepo.name,
      };

      await api.updateProject(project.id, project.name, [target]);

      const { scan } = await api.startScan(project.id);
      await load();
      setShowModal(false);
      onOpen(scan.id);
    } catch (cause) {
      setModalError((cause as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const runGitScan = async () => {
    const project = projects[0];
    if (!project) return;
    setStarting(true);
    setModalError(null);
    try {
      const { scan } = await api.startScan(project.id);
      await load();
      setShowModal(false);
      onOpen(scan.id);
    } catch (cause) {
      setModalError((cause as Error).message);
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
    const project = projects[0];
    if (!project || !selectedFile) return;
    setStarting(true);
    setModalError(null);
    try {
      const { scan } = await api.uploadZipScan(project.id, selectedFile);
      await load();
      setShowModal(false);
      onOpen(scan.id);
    } catch (cause) {
      setModalError((cause as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const latest = scans.find((scan) => scan.status === "succeeded");

  return (
    <>
      <header className="pagehead">
        <div>
          <div className="label">Quantum security posture</div>
          <h1>{projects[0]?.name ?? "No project"}</h1>
          <p>
            {projects[0]?.description ??
              "Connect a repository to start discovering the cryptography your estate depends on."}
          </p>
        </div>
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            setModalError(null);
            setShowModal(true);
          }}
          disabled={!projects[0]}
        >
          Create Scan
        </button>
      </header>

      {error ? (
        <div className="banner">
          <b>Could not load</b>
          {error}
        </div>
      ) : null}

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--raised)",
              border: "1px solid var(--edge)",
              padding: 24,
              width: 520,
              maxWidth: "90vw",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Create Scan</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={starting}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--edge)", paddingBottom: 10 }}>
              <button
                type="button"
                className={`btn ${scanMode === "github" ? "primary" : ""}`}
                onClick={() => setScanMode("github")}
                disabled={starting}
                style={{ padding: "6px 12px" }}
              >
                Connect GitHub
              </button>
              <button
                type="button"
                className={`btn ${scanMode === "git" ? "primary" : ""}`}
                onClick={() => setScanMode("git")}
                disabled={starting}
                style={{ padding: "6px 12px" }}
              >
                Git Repository
              </button>
              <button
                type="button"
                className={`btn ${scanMode === "zip" ? "primary" : ""}`}
                onClick={() => setScanMode("zip")}
                disabled={starting}
                style={{ padding: "6px 12px" }}
              >
                Upload ZIP
              </button>
            </div>

            {modalError && (
              <div className="banner" style={{ marginBottom: 16, borderColor: "var(--critical)" }}>
                <b style={{ color: "var(--critical)" }}>Error</b>
                {modalError}
              </div>
            )}

            {scanMode === "github" ? (
              <div>
                {!githubStatus?.configured ? (
                  <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
                    <b style={{ color: "#f59e0b" }}>GitHub App Not Configured</b>
                    <p style={{ margin: "4px 0 0 0", color: "var(--muted)" }}>
                      The server does not have <code>GITHUB_APP_ID</code> and <code>GITHUB_APP_PRIVATE_KEY</code> set. You can use the Git Repository or Upload ZIP tabs in the meantime.
                    </p>
                  </div>
                ) : !githubStatus?.connected ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
                      Connect your GitHub account or organization to select repositories and scan with zero personal tokens required.
                    </p>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleConnectGithub}
                      style={{ padding: "8px 20px" }}
                    >
                      Connect GitHub
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", padding: "8px 12px", borderRadius: 6, marginBottom: 16 }}>
                      <span style={{ fontSize: 13 }}>
                        Connected as: <strong style={{ color: "#10b981" }}>{githubStatus.installation?.accountLogin}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleDisconnectGithub}
                        style={{ background: "none", border: "none", color: "var(--critical)", cursor: "pointer", fontSize: 12 }}
                      >
                        Disconnect
                      </button>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                        Repository
                      </label>
                      {loadingGithubRepos ? (
                        <div style={{ fontSize: 13, color: "var(--quantum)" }}>Loading repositories…</div>
                      ) : githubRepos.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>No repositories accessible to the GitHub App.</div>
                      ) : (
                        <select
                          value={selectedRepo?.id ?? ""}
                          onChange={handleRepoSelectChange}
                          disabled={starting}
                          style={{ width: "100%", padding: 8, background: "var(--bg)", border: "1px solid var(--edge)", color: "#fff" }}
                        >
                          {githubRepos.map((repo) => (
                            <option key={repo.id} value={repo.id}>
                              {repo.fullName} {repo.private ? "(private)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                        Branch
                      </label>
                      {loadingGithubBranches ? (
                        <div style={{ fontSize: 13, color: "var(--quantum)" }}>Loading branches…</div>
                      ) : (
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          disabled={starting || !selectedRepo}
                          style={{ width: "100%", padding: 8, background: "var(--bg)", border: "1px solid var(--edge)", color: "#fff" }}
                        >
                          {githubBranches.length === 0 ? (
                            <option value={selectedRepo?.defaultBranch || "main"}>
                              {selectedRepo?.defaultBranch || "main"}
                            </option>
                          ) : (
                            githubBranches.map((b) => (
                              <option key={b.name} value={b.name}>
                                {b.name}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button type="button" className="btn" onClick={() => setShowModal(false)} disabled={starting}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={runGithubScan}
                        disabled={starting || !selectedRepo}
                      >
                        {starting ? "Starting Scan…" : "Start Scan"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : scanMode === "git" ? (
              <div>
                <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
                  Scan the configured Git repository for <b>{projects[0]?.name}</b>.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} disabled={starting}>
                    Cancel
                  </button>
                  <button type="button" className="btn primary" onClick={runGitScan} disabled={starting}>
                    {starting ? "Starting…" : "Start Git Scan"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14 }}>
                  Upload a <b>.zip</b> archive containing project source files (max 50MB).
                </p>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  disabled={starting}
                  style={{ marginBottom: 16, width: "100%" }}
                />
                {selectedFile && (
                  <div style={{ fontSize: 13, color: "var(--quantum)", marginBottom: 16 }}>
                    Selected: <b>{selectedFile.name}</b> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} disabled={starting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={runZipScan}
                    disabled={starting || !selectedFile}
                  >
                    {starting ? "Uploading & Scanning…" : "Upload & Start Scan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {latest?.posture ? (
        <Readout
          items={[
            {
              label: "Posture",
              value: `${latest.posture.overall}`,
              sub: latest.posture.severity.toUpperCase(),
              tone: SEVERITY_TONE[latest.posture.severity],
            },
            { label: "Confirmed", value: latest.stats.findingsConfirmed, sub: "findings" },
            { label: "Awaiting review", value: latest.stats.needsHuman, sub: "low confidence" },
            { label: "Files scanned", value: latest.stats.filesScanned, sub: "in last scan" },
          ]}
        />
      ) : null}

      <h2 className="label" style={{ marginBottom: 12 }}>
        Scans
      </h2>

      {scans.length === 0 ? (
        <Empty title="No scans yet">
          <p>
            A scan reads your repositories, uploaded archives, and endpoints, works out what cryptography they depend
            on, and tells you what breaks when the maths does.
          </p>
          <button className="btn primary" type="button" onClick={() => setShowModal(true)} disabled={!projects[0]}>
            Run the first scan
          </button>
        </Empty>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 120 }}>ID</th>
              <th>Phase</th>
              <th style={{ width: 90 }}>Posture</th>
              <th style={{ width: 110 }}>Confirmed</th>
              <th style={{ width: 110 }}>Review</th>
              <th style={{ width: 130 }}>Started</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="row" onClick={() => onOpen(scan.id)}>
                <td className="mono" style={{ color: "var(--quantum)" }}>
                  {scan.id}
                </td>
                <td>
                  {scan.phase}
                  {scan.status === "failed" ? (
                    <span style={{ color: "var(--critical)", marginLeft: 8 }}>failed</span>
                  ) : null}
                </td>
                <td className="mono">
                  {scan.posture ? (
                    <span style={{ color: SEVERITY_TONE[scan.posture.severity] }}>
                      {scan.posture.overall}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="mono">{scan.stats.findingsConfirmed}</td>
                <td className="mono">{scan.stats.needsHuman}</td>
                <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
                  {new Date(scan.startedAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
