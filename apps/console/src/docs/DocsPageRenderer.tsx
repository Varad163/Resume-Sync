import { DocsOverviewPage } from "./pages/DocsOverviewPage.js";
import { DocsWhatIsIronBastionPage } from "./pages/DocsWhatIsIronBastionPage.js";
import { DocsHowItWorksPage } from "./pages/DocsHowItWorksPage.js";
import { DocsQuickStartPage } from "./pages/DocsQuickStartPage.js";
import { DocsUsingDashboardPage } from "./pages/DocsUsingDashboardPage.js";
import { DocsUsingProjectsPage } from "./pages/DocsUsingProjectsPage.js";
import { DocsUsingRepositoriesPage } from "./pages/DocsUsingRepositoriesPage.js";
import { DocsUsingScansPage } from "./pages/DocsUsingScansPage.js";
import { DocsUsingFindingsPage } from "./pages/DocsUsingFindingsPage.js";
import { DocsUsingInventoryPage } from "./pages/DocsUsingInventoryPage.js";
import { DocsUsingCbomPage } from "./pages/DocsUsingCbomPage.js";
import { DocsUsingMigrationPlanPage } from "./pages/DocsUsingMigrationPlanPage.js";
import { DocsUsingWatchtowerPage } from "./pages/DocsUsingWatchtowerPage.js";
import { DocsUsingCertifyPage } from "./pages/DocsUsingCertifyPage.js";
import { DocsUsingIssuesPage } from "./pages/DocsUsingIssuesPage.js";
import { DocsIntegrationsGithubPage } from "./pages/DocsIntegrationsGithubPage.js";
import { DocsIntegrationsZipPage } from "./pages/DocsIntegrationsZipPage.js";
import { DocsIntegrationsCliPage } from "./pages/DocsIntegrationsCliPage.js";
import { DocsIntegrationsTlsPage } from "./pages/DocsIntegrationsTlsPage.js";
import { DocsSecurityAuthPage } from "./pages/DocsSecurityAuthPage.js";
import { DocsSecurityCognitoPage } from "./pages/DocsSecurityCognitoPage.js";
import { DocsSecurityMultiTenancyPage } from "./pages/DocsSecurityMultiTenancyPage.js";
import { DocsSecurityCredentialsPage } from "./pages/DocsSecurityCredentialsPage.js";
import { DocsSecurityDataPage } from "./pages/DocsSecurityDataPage.js";
import { DocsSecuritySecretsPage } from "./pages/DocsSecuritySecretsPage.js";
import { DocsScanningLifecyclePage } from "./pages/DocsScanningLifecyclePage.js";
import { DocsScanningLanguagesPage } from "./pages/DocsScanningLanguagesPage.js";
import { DocsScanningDependencyPage } from "./pages/DocsScanningDependencyPage.js";
import { DocsScanningSourceCodePage } from "./pages/DocsScanningSourceCodePage.js";
import { DocsScanningTlsDetectionPage } from "./pages/DocsScanningTlsDetectionPage.js";
import { DocsScanningAiAnalysisPage } from "./pages/DocsScanningAiAnalysisPage.js";
import { DocsScanningDeterministicPage } from "./pages/DocsScanningDeterministicPage.js";
import { DocsScanningRiskScoringPage } from "./pages/DocsScanningRiskScoringPage.js";
import { DocsArchitectureSystemPage } from "./pages/DocsArchitectureSystemPage.js";
import { DocsArchitecturePipelinePage } from "./pages/DocsArchitecturePipelinePage.js";
import { DocsArchitectureAiAgentsPage } from "./pages/DocsArchitectureAiAgentsPage.js";
import { DocsArchitectureDatabasePage } from "./pages/DocsArchitectureDatabasePage.js";
import { DocsArchitectureAwsPage } from "./pages/DocsArchitectureAwsPage.js";
import { DocsArchitectureStoragePage } from "./pages/DocsArchitectureStoragePage.js";
import { DocsArchitectureQueueWorkerPage } from "./pages/DocsArchitectureQueueWorkerPage.js";
import { DocsOperationsProductionDeploymentPage } from "./pages/DocsOperationsProductionDeploymentPage.js";
import { DocsOperationsMonitoringPage } from "./pages/DocsOperationsMonitoringPage.js";
import { DocsOperationsAuditLogsPage } from "./pages/DocsOperationsAuditLogsPage.js";
import { DocsOperationsReliabilityPage } from "./pages/DocsOperationsReliabilityPage.js";
import { DocsOperationsTenantIsolationPage } from "./pages/DocsOperationsTenantIsolationPage.js";
import { DocsOperationsSecurityControlsPage } from "./pages/DocsOperationsSecurityControlsPage.js";
import { DocsReferenceApiPage } from "./pages/DocsReferenceApiPage.js";
import { DocsReferenceEnvVarsPage } from "./pages/DocsReferenceEnvVarsPage.js";
import { DocsReferenceCliPage } from "./pages/DocsReferenceCliPage.js";
import { DocsReferenceTroubleshootingPage } from "./pages/DocsReferenceTroubleshootingPage.js";
import { DocsReferenceFaqPage } from "./pages/DocsReferenceFaqPage.js";
import { DocsReferenceGlossaryPage } from "./pages/DocsReferenceGlossaryPage.js";

interface DocsPageRendererProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function DocsPageRenderer({ currentPath, onNavigate }: DocsPageRendererProps) {
  const cleanPath = currentPath.replace(/\/$/, "");

  switch (cleanPath) {
    // 1. GETTING STARTED
    case "/docs":
    case "":
      return <DocsOverviewPage onNavigate={onNavigate} />;
    case "/docs/what-is-ironbastion":
      return <DocsWhatIsIronBastionPage />;
    case "/docs/how-it-works":
      return <DocsHowItWorksPage />;
    case "/docs/quick-start":
      return <DocsQuickStartPage onNavigate={onNavigate} />;

    // 2. USING IRONBASTION
    case "/docs/using/dashboard":
      return <DocsUsingDashboardPage />;
    case "/docs/using/projects":
      return <DocsUsingProjectsPage />;
    case "/docs/using/repositories":
      return <DocsUsingRepositoriesPage />;
    case "/docs/using/scans":
      return <DocsUsingScansPage />;
    case "/docs/using/findings":
      return <DocsUsingFindingsPage />;
    case "/docs/using/inventory":
      return <DocsUsingInventoryPage />;
    case "/docs/using/cbom":
      return <DocsUsingCbomPage />;
    case "/docs/using/migration-plan":
      return <DocsUsingMigrationPlanPage />;
    case "/docs/using/watchtower":
      return <DocsUsingWatchtowerPage />;
    case "/docs/using/certify":
      return <DocsUsingCertifyPage />;
    case "/docs/using/issues":
      return <DocsUsingIssuesPage />;

    // 3. INTEGRATIONS
    case "/docs/integrations/github-app":
      return <DocsIntegrationsGithubPage />;
    case "/docs/integrations/zip-upload":
      return <DocsIntegrationsZipPage />;
    case "/docs/integrations/cli-scanner":
      return <DocsIntegrationsCliPage />;
    case "/docs/integrations/tls-scanning":
      return <DocsIntegrationsTlsPage />;

    // 4. SECURITY & ACCESS
    case "/docs/security/authentication":
      return <DocsSecurityAuthPage />;
    case "/docs/security/cognito":
      return <DocsSecurityCognitoPage />;
    case "/docs/security/multi-tenancy":
      return <DocsSecurityMultiTenancyPage />;
    case "/docs/security/credentials":
      return <DocsSecurityCredentialsPage />;
    case "/docs/security/data-security":
      return <DocsSecurityDataPage />;
    case "/docs/security/secrets":
      return <DocsSecuritySecretsPage />;

    // 5. SCANNING
    case "/docs/scanning/lifecycle":
      return <DocsScanningLifecyclePage />;
    case "/docs/scanning/languages":
      return <DocsScanningLanguagesPage />;
    case "/docs/scanning/dependency":
      return <DocsScanningDependencyPage />;
    case "/docs/scanning/source-code":
      return <DocsScanningSourceCodePage />;
    case "/docs/scanning/tls-detection":
      return <DocsScanningTlsDetectionPage />;
    case "/docs/scanning/ai-analysis":
      return <DocsScanningAiAnalysisPage />;
    case "/docs/scanning/deterministic":
      return <DocsScanningDeterministicPage />;
    case "/docs/scanning/risk-scoring":
      return <DocsScanningRiskScoringPage />;

    // 6. ARCHITECTURE
    case "/docs/architecture/system":
      return <DocsArchitectureSystemPage />;
    case "/docs/architecture/pipeline":
      return <DocsArchitecturePipelinePage />;
    case "/docs/architecture/ai-agents":
      return <DocsArchitectureAiAgentsPage />;
    case "/docs/architecture/database":
      return <DocsArchitectureDatabasePage />;
    case "/docs/architecture/aws":
      return <DocsArchitectureAwsPage />;
    case "/docs/architecture/storage":
      return <DocsArchitectureStoragePage />;
    case "/docs/architecture/queue-worker":
      return <DocsArchitectureQueueWorkerPage />;

    // 7. ENTERPRISE / OPERATIONS
    case "/docs/operations/production-deployment":
      return <DocsOperationsProductionDeploymentPage />;
    case "/docs/operations/monitoring":
      return <DocsOperationsMonitoringPage />;
    case "/docs/operations/audit-logs":
      return <DocsOperationsAuditLogsPage />;
    case "/docs/operations/reliability":
      return <DocsOperationsReliabilityPage />;
    case "/docs/operations/tenant-isolation":
      return <DocsOperationsTenantIsolationPage />;
    case "/docs/operations/security-controls":
      return <DocsOperationsSecurityControlsPage />;

    // 8. REFERENCE
    case "/docs/reference/api":
      return <DocsReferenceApiPage />;
    case "/docs/reference/env-vars":
      return <DocsReferenceEnvVarsPage />;
    case "/docs/reference/cli":
      return <DocsReferenceCliPage />;
    case "/docs/reference/troubleshooting":
      return <DocsReferenceTroubleshootingPage />;
    case "/docs/reference/faq":
      return <DocsReferenceFaqPage />;
    case "/docs/reference/glossary":
      return <DocsReferenceGlossaryPage />;

    // ALIASES & FALLBACKS
    case "/docs/scanning/repositories":
      return <DocsUsingRepositoriesPage />;
    case "/docs/scanning/github":
    case "/docs/github":
      return <DocsIntegrationsGithubPage />;
    case "/docs/scanning/zip":
      return <DocsIntegrationsZipPage />;
    case "/docs/scanning/cli":
      return <DocsIntegrationsCliPage />;
    case "/docs/analysis/inventory":
      return <DocsUsingInventoryPage />;
    case "/docs/analysis/findings":
      return <DocsUsingFindingsPage />;
    case "/docs/analysis/risk-scoring":
      return <DocsScanningRiskScoringPage />;
    case "/docs/outputs/cbom":
      return <DocsUsingCbomPage />;
    case "/docs/outputs/migration-plan":
      return <DocsUsingMigrationPlanPage />;
    case "/docs/outputs/reports":
      return <DocsUsingDashboardPage />;
    case "/docs/outputs/certify":
      return <DocsUsingCertifyPage />;
    case "/docs/monitoring/watchtower":
      return <DocsUsingWatchtowerPage />;
    case "/docs/architecture":
      return <DocsArchitectureSystemPage />;
    case "/docs/architecture/security":
      return <DocsSecurityDataPage />;
    case "/docs/development/local-development":
      return <DocsQuickStartPage onNavigate={onNavigate} />;
    case "/docs/development/project-structure":
      return <DocsArchitectureSystemPage />;
    case "/docs/development/testing":
      return <DocsOperationsProductionDeploymentPage />;
    case "/docs/development/environment":
      return <DocsReferenceEnvVarsPage />;
    case "/docs/troubleshooting":
      return <DocsReferenceTroubleshootingPage />;

    default:
      return <DocsOverviewPage onNavigate={onNavigate} />;
  }
}
