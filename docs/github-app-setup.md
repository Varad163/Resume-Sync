# GitHub App Setup & Configuration Guide

This guide explains how an administrator configures the IronBastion GitHub App to enable zero-token repository scanning and continuous Watchtower monitoring.

---

## 1. Create GitHub App

1. Log in to GitHub and navigate to **Settings** $\rightarrow$ **Developer settings** $\rightarrow$ **GitHub Apps** $\rightarrow$ **New GitHub App** (or Organization settings $\rightarrow$ Developer settings $\rightarrow$ GitHub Apps).
2. Set the following fields:
   - **GitHub App name**: `IronBastion PQC Scanner` (or your preferred unique name)
   - **Homepage URL**: `https://your-ironbastion-domain.com`
   - **Callback URL**: `https://your-ironbastion-domain.com/v1/integrations/github/callback` (for local development: `http://localhost:5199/v1/integrations/github/callback` or `http://localhost:8787/v1/integrations/github/callback`)
   - **Webhook**: Uncheck "Active" (webhooks are not required for initial polling setup).

---

## 2. Configure Permissions

Under **Repository permissions**, request the minimum read-only permissions:

| Permission | Access Level | Reason |
| :--- | :--- | :--- |
| **Contents** | **Read-only** | Clone source code into ephemeral worker directory for static cryptography scanning |
| **Metadata** | **Read-only** | List repositories and default branches |

> [!IMPORTANT]
> - Do **NOT** request Write permissions to repository contents, issues, or pull requests.
> - Do **NOT** request Organization write permissions.

---

## 3. Generate Private Key & Credentials

1. After creating the GitHub App, note down the **App ID** and **Client ID**.
2. Scroll to the **Private keys** section and click **Generate a private key**.
3. Save the downloaded `.pem` file securely.

---

## 4. Environment Variables Configuration

Configure the following environment variables on the IronBastion API and Worker servers:

```bash
# GitHub App Numerical ID
GITHUB_APP_ID="123456"

# GitHub App Private Key (PEM format string OR Base64-encoded string)
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"

# Optional GitHub App metadata
GITHUB_APP_CLIENT_ID="Iv1.xxxxxxxxxxxx"
GITHUB_APP_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GITHUB_APP_NAME="ironbastion-pqc-scanner"
```

### Local Development Setup

For local development, add the variables to your `.env` or run `scripts/dev.mjs` with environment overrides:

```bash
GITHUB_APP_ID="123456" GITHUB_APP_PRIVATE_KEY="$(cat path/to/private-key.pem)" npm run dev
```

---

## 5. Security & Token Lifecycle

- **No Token Storage**: Personal Access Tokens (PATs) and user GitHub passwords are never requested or stored.
- **Short-Lived Installation Access Tokens**: The backend generates short-lived Installation Access Tokens (`ghs_...`, 1-hour expiration) on demand using RS256 JWTs signed by the backend private key.
- **Askpass Isolation**: Git operations use `GIT_ASKPASS` to pass installation tokens in memory. Credentials are never written to disk, `.git/config`, or process logs.
- **Tenant Isolation**: Every GitHub installation is bound immutably to an IronBastion `tenant_id` and isolated via PostgreSQL Row Level Security.
