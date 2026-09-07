import { DocsOverviewPage } from "./pages/DocsOverviewPage.js";
import { DocsHowItWorksPage } from "./pages/DocsHowItWorksPage.js";
import { DocsQuickStartPage } from "./pages/DocsQuickStartPage.js";
import { DocsScanningReposPage } from "./pages/DocsScanningReposPage.js";
import { DocsScanningGithubPage } from "./pages/DocsScanningGithubPage.js";
import { DocsScanningZipPage } from "./pages/DocsScanningZipPage.js";
import { DocsScanningCliPage } from "./pages/DocsScanningCliPage.js";
import { DocsAnalysisInventoryPage } from "./pages/DocsAnalysisInventoryPage.js";
import { DocsAnalysisFindingsPage } from "./pages/DocsAnalysisFindingsPage.js";
import { DocsAnalysisRiskScoringPage } from "./pages/DocsAnalysisRiskScoringPage.js";
import { DocsOutputsCbomPage } from "./pages/DocsOutputsCbomPage.js";
import { DocsOutputsMigrationPlanPage } from "./pages/DocsOutputsMigrationPlanPage.js";
import { DocsOutputsReportsPage } from "./pages/DocsOutputsReportsPage.js";
import { DocsOutputsCertifyPage } from "./pages/DocsOutputsCertifyPage.js";
import { DocsMonitoringWatchtowerPage } from "./pages/DocsMonitoringWatchtowerPage.js";
import { DocsArchitecturePage } from "./pages/DocsArchitecturePage.js";
import { DocsArchitectureSecurityPage } from "./pages/DocsArchitectureSecurityPage.js";
import { DocsDevelopmentLocalPage } from "./pages/DocsDevelopmentLocalPage.js";
import { DocsDevelopmentStructurePage } from "./pages/DocsDevelopmentStructurePage.js";
import { DocsDevelopmentTestingPage } from "./pages/DocsDevelopmentTestingPage.js";
import { DocsDevelopmentEnvPage } from "./pages/DocsDevelopmentEnvPage.js";
import { DocsTroubleshootingPage } from "./pages/DocsTroubleshootingPage.js";

interface DocsPageRendererProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function DocsPageRenderer({ currentPath, onNavigate }: DocsPageRendererProps) {
  const cleanPath = currentPath.replace(/\/$/, "");

  switch (cleanPath) {
    case "/docs":
    case "":
      return <DocsOverviewPage onNavigate={onNavigate} />;
    case "/docs/how-it-works":
      return <DocsHowItWorksPage />;
    case "/docs/quick-start":
      return <DocsQuickStartPage onNavigate={onNavigate} />;
    case "/docs/scanning/repositories":
      return <DocsScanningReposPage />;
    case "/docs/scanning/github":
      return <DocsScanningGithubPage />;
    case "/docs/scanning/zip":
      return <DocsScanningZipPage />;
    case "/docs/scanning/cli":
      return <DocsScanningCliPage />;
    case "/docs/analysis/inventory":
      return <DocsAnalysisInventoryPage />;
    case "/docs/analysis/findings":
      return <DocsAnalysisFindingsPage />;
    case "/docs/analysis/risk-scoring":
      return <DocsAnalysisRiskScoringPage />;
    case "/docs/outputs/cbom":
      return <DocsOutputsCbomPage />;
    case "/docs/outputs/migration-plan":
      return <DocsOutputsMigrationPlanPage />;
    case "/docs/outputs/reports":
      return <DocsOutputsReportsPage />;
    case "/docs/outputs/certify":
      return <DocsOutputsCertifyPage />;
    case "/docs/monitoring/watchtower":
      return <DocsMonitoringWatchtowerPage />;
    case "/docs/architecture":
      return <DocsArchitecturePage />;
    case "/docs/architecture/security":
      return <DocsArchitectureSecurityPage />;
    case "/docs/development/local-development":
      return <DocsDevelopmentLocalPage />;
    case "/docs/development/project-structure":
      return <DocsDevelopmentStructurePage />;
    case "/docs/development/testing":
      return <DocsDevelopmentTestingPage />;
    case "/docs/development/environment":
      return <DocsDevelopmentEnvPage />;
    case "/docs/troubleshooting":
      return <DocsTroubleshootingPage />;
    default:
      return <DocsOverviewPage onNavigate={onNavigate} />;
  }
}
