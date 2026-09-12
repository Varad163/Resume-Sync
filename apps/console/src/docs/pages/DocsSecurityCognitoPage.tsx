export function DocsSecurityCognitoPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>AWS Cognito Integration</h2>
        <p>
          IronBastion leverages <b>AWS Cognito User Pools</b> for enterprise identity management, single sign-on (SSO), and OAuth 2.0 PKCE authentication.
        </p>
      </section>

      <section className="docs-section">
        <h2>Cognito Configuration</h2>
        <ul>
          <li><b>User Pool ID</b>: Configured via <code>COGNITO_USER_POOL_ID</code>.</li>
          <li><b>Client ID</b>: Configured via <code>COGNITO_CLIENT_ID</code>.</li>
          <li><b>JWKS Key Set</b>: Retrieved dynamically from <code>.well-known/jwks.json</code> and cached using <code>jose</code> remote JWK set loaders.</li>
          <li><b>User Roles</b>: Normalized to <code>owner</code>, <code>member</code>, or <code>viewer</code> via custom claim <code>custom:role</code>.</li>
        </ul>
      </section>
    </div>
  );
}
