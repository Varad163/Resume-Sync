import { useEffect, useState } from "react";
import { api, setToken } from "../api.js";

export function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [authMode, setAuthMode] = useState<"dev" | "cognito" | "unknown">("unknown");
  const [customToken, setCustomToken] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    void api
      .health()
      .then((res) => {
        if (live) {
          setAuthMode(res.auth === "dev" ? "dev" : "cognito");
        }
      })
      .catch(() => {
        if (live) {
          setAuthMode("dev");
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const handleDevLogin = () => {
    const defaultDevToken = "dev.tnt_demo.demo@ironbastion.ai";
    setToken(defaultDevToken);
    onLoginSuccess();
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const token = customToken.trim();
    if (!token) {
      setError("Please enter a valid authentication token.");
      return;
    }
    setLoading(true);
    setToken(token);

    // Verify token against API
    api
      .projects()
      .then(() => {
        onLoginSuccess();
      })
      .catch((err: Error) => {
        setError(`Authentication failed: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--void)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--raised)",
          border: "1px solid var(--edge)",
          padding: 32,
          borderRadius: 4,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Mark />
          <h1 style={{ fontSize: 24, margin: 0, fontWeight: 700 }}>
            Iron<span style={{ color: "var(--quantum)" }}>bastion</span>
          </h1>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0, marginBottom: 28 }}>
          Quantum Security Posture & Cryptographic Inventory Platform
        </p>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(233, 85, 85, 0.1)",
              border: "1px solid var(--critical)",
              color: "var(--critical)",
              fontSize: 13,
              marginBottom: 20,
              borderRadius: 4,
            }}
          >
            {error}
          </div>
        )}

        {authMode === "dev" ? (
          <div>
            <div
              className="label"
              style={{
                marginBottom: 12,
                color: "var(--quantum)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--quantum)",
                }}
              />
              Development Mode Active
            </div>

            <button
              type="button"
              className="btn primary"
              onClick={handleDevLogin}
              style={{ width: "100%", padding: "10px 16px", marginBottom: 20, fontSize: 14 }}
            >
              Log in as Demo User (dev.tnt_demo)
            </button>

            <div
              style={{
                borderTop: "1px solid var(--edge)",
                paddingTop: 18,
                marginTop: 10,
              }}
            >
              <div className="label" style={{ marginBottom: 10 }}>
                Custom Dev Token
              </div>
              <form onSubmit={handleCustomLogin}>
                <input
                  type="text"
                  placeholder="dev.<tenantId>.<email>"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--edge)",
                    color: "var(--display)",
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                />
                <button
                  type="submit"
                  className="btn ghost"
                  disabled={loading}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                >
                  {loading ? "Authenticating…" : "Use Custom Dev Token"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div>
            <div
              className="label"
              style={{
                marginBottom: 12,
                color: "var(--legacy)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--legacy)",
                }}
              />
              Production Authentication (AWS Cognito)
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 20 }}>
              Production accounts are provisioned via AWS Cognito. Enter your JWT ID or Access Token
              below to authenticate.
            </p>

            <form onSubmit={handleCustomLogin}>
              <div className="label" style={{ marginBottom: 8 }}>
                Cognito Bearer JWT Token
              </div>
              <textarea
                rows={4}
                placeholder="eyJhbGciOiJSUzI1NiIs..."
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--edge)",
                  color: "var(--display)",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  marginBottom: 16,
                  resize: "vertical",
                }}
              />
              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{ width: "100%", padding: "10px 16px", fontSize: 14 }}
              >
                {loading ? "Verifying Token…" : "Authenticate Session"}
              </button>
            </form>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--edge)",
            textAlign: "center",
            fontSize: 11,
            color: "var(--dim)",
            fontFamily: "var(--mono)",
          }}
        >
          IronBastion v0.1.0 · Zero-Knowledge Cryptographic Platform
        </div>
      </div>
    </div>
  );
}

function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.2 L18.8 7 L18.8 13 L12 20.6 L5.2 13 L5.2 7 Z"
        fill="none"
        stroke="var(--quantum)"
        strokeWidth="1.8"
      />
    </svg>
  );
}
