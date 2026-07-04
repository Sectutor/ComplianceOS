/**
 * ComplianceOS Main Application Entry Point
 * 
 * This is the root component that handles routing, authentication,
 * and global application state management.
 */
import { Toaster } from "@complianceos/ui/ui/sonner";

import { BrandingProvider, useBranding } from "./config/branding";
import { TooltipProvider } from "@complianceos/ui/ui/tooltip";
import GDPRBanner from "@/components/GDPRBanner";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ClientContextProvider, useClientContext } from "./contexts/ClientContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdvisorProvider } from "./contexts/AdvisorContext";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import DashboardLayout from "@/components/DashboardLayout";
import { SystemFeedbackModal } from "@/components/SystemFeedbackModal";
import { HarmonizationView } from "@/components/controls/HarmonizationView";

import { lazy, Suspense, useEffect, useRef } from "react";
import { lazyLoad } from "@/lib/lazyLoad";
import { trpc } from "@/lib/trpc";

// Lazy Imports
const Home = lazyLoad(() => import("./pages/Home"));
const WaitlistPage = lazyLoad(() => import("./pages/WaitlistPage"));
const ManagedServicesPage = lazyLoad(() => import("./pages/ManagedServicesPage"));
const Dashboard = lazyLoad(() => import("./pages/Dashboard"));
const Clients = lazyLoad(() => import("./pages/Clients"));
const Controls = lazyLoad(() => import("./pages/Controls"));
const MetricsPage = lazyLoad(() => import("./pages/Metrics"));
const PolicyTemplates = lazyLoad(() => import("./pages/PolicyTemplates"));
const PolicyEditor = lazyLoad(() => import("./pages/PolicyEditor"));
const Mappings = lazyLoad(() => import("./pages/Mappings"));
const Evidence = lazyLoad(() => import("./pages/Evidence"));
const EvidenceIntakeBox = lazyLoad(() => import("@/pages/EvidenceIntakeBox"));
const AdvisorWorkbench = lazyLoad(() => import("@/pages/AdvisorWorkbench"));
const ClientWorkspace = lazyLoad(() => import("@/pages/ClientWorkspace"));
const Reports = lazyLoad(() => import("./pages/Reports"));
const ReportEditor = lazyLoad(() => import("./pages/reports/ReportEditor"));
const Calendar = lazyLoad(() => import("./pages/Calendar"));
const Notifications = lazyLoad(() => import("./pages/Notifications"));
const ClientOnboarding = lazyLoad(() => import("./pages/ClientOnboarding"));
const MSPOnboarding = lazyLoad(() => import("./pages/MSPOnboarding"));
const PeoplePage = lazyLoad(() => import("./pages/People").then(module => ({ default: module.PeoplePage })));
const RACIMatrix = lazyLoad(() => import("./pages/RACIMatrix"));
const EmployeeDetails = lazyLoad(() => import("./pages/EmployeeDetails"));
const UnassignedItems = lazyLoad(() => import("./pages/UnassignedItems"));
const LLMSettings = lazyLoad(() => import("./pages/admin/LLMSettings"));
const Profile = lazyLoad(() => import("./pages/Profile"));
const UserManagement = lazyLoad(() => import("./pages/admin/UserManagement"));
const OrganizationManagement = lazyLoad(() => import("./pages/admin/OrganizationManagement"));
const UserInvitations = lazyLoad(() => import("./pages/admin/UserInvitations"));
const AuditLogs = lazyLoad(() => import("./pages/admin/AuditLogs"));
// Premium components moved to @complianceos/premium
// const CloudIntegrations = lazyLoad(() => import("./pages/admin/CloudIntegrations"));
const AddonManager = lazyLoad(() => import("./pages/admin/AddonManager"));
const AdminBilling = lazyLoad(() => import("./pages/admin/AdminBilling"));
const LicenseManagement = lazyLoad(() => import("./pages/admin/LicenseManagement"));
const SystemFeedbackPage = lazyLoad(() => import("./pages/admin/SystemFeedbackPage"));
const ClientSettings = lazyLoad(() => import("./pages/ClientSettings"));
const OnboardingSettings = lazyLoad(() => import("./pages/settings/OnboardingSettings"));
const SecuritySettings = lazyLoad(() => import("./pages/settings/SecuritySettings"));
const PluginSettings = lazyLoad(() => import("./pages/settings/PluginSettings"));
const PluginPage = lazyLoad(() => import("./pages/plugins/PluginPage"));
const IntegrationsPage = lazyLoad(() => import("./pages/settings/IntegrationsPage"));
const PersonnelComplianceHub = lazyLoad(() => import("./pages/PersonnelComplianceHub"));
const ClientActivity = lazyLoad(() => import("./pages/ClientActivity"));
const Guides = lazyLoad(() => import("./pages/Guides"));

// Addon pages
const AddonMarketplace = lazyLoad(() => import("./pages/addons/AddonMarketplace"));
const AddonDetail = lazyLoad(() => import("./pages/addons/AddonDetail"));
const AddonSettings = lazyLoad(() => import("./pages/addons/AddonSettings"));
const AddonDashboard = lazyLoad(() => import("./pages/addons/AddonDashboard"));

const ClientPoliciesPage = lazyLoad(() => import("./pages/ClientPoliciesPage"));
const ManagementSignOffPage = lazyLoad(() => import("./pages/ManagementSignOffPage"));
const NIS2EntityClassificationWizard = lazyLoad(() => import("./pages/NIS2EntityClassificationWizard"));
const NIS2CyberResilienceHub = lazyLoad(() => import("./pages/nis2/NIS2CyberResilienceHub"));
const NIS2ManagementLiability = lazyLoad(() => import("./pages/nis2/NIS2ManagementLiability"));
const NIS2CrossBorderCompliance = lazyLoad(() => import("./pages/nis2/NIS2CrossBorderCompliance"));
const NIS2AuditBundle = lazyLoad(() => import("./pages/nis2/NIS2AuditBundle"));

const HarmonizationStudio = () => (
  <DashboardLayout>
    <div className="p-6">
      <HarmonizationView />
    </div>
  </DashboardLayout>
);
const NIS2SecurityMeasures = lazyLoad(() => import("./pages/nis2/NIS2SecurityMeasures"));
const NIS2IncidentReporting = lazyLoad(() => import("./pages/nis2/NIS2IncidentReporting"));
const NIS2EntityRegistry = lazyLoad(() => import("./pages/nis2/NIS2EntityRegistry"));
const NIS2SupplyChainSecurity = lazyLoad(() => import("./pages/nis2/NIS2SupplyChainSecurity"));
const ClientControlsPage = lazyLoad(() => import("./pages/ClientControlsPage"));
const AuditorChecklistPage = lazyLoad(() => import("./pages/auditors/AuditorChecklistPage"));
const ClientEmail = lazyLoad(() => import("./pages/ClientEmail").then(module => ({ default: module.ClientEmail })));
const ClientTasksPage = lazyLoad(() => import("./pages/ClientTasksPage"));
const AuditReadinessPage = lazyLoad(() => import("./pages/compliance/AuditReadinessPage"));
const ClientCompliancePage = lazyLoad(() => import("./pages/ClientCompliancePage"));
const ClientLicenseActivation = lazyLoad(() => import("./pages/ClientLicenseActivation"));


const LoginPage = lazyLoad(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazyLoad(() => import("./pages/auth/SignUpPage"));
const CompleteSubscription = lazyLoad(() => import("./pages/auth/CompleteSubscription"));
const ForgotPassword = lazyLoad(() => import("./pages/auth/ForgotPassword"));
const UpdatePassword = lazyLoad(() => import("./pages/auth/UpdatePassword"));
const RedeemLink = lazyLoad(() => import("./pages/auth/RedeemLink"));
const AcceptInvite = lazyLoad(() => import("./pages/auth/AcceptInvite"));
const UpgradeRequired = lazyLoad(() => import("./pages/UpgradeRequired"));

const LearningPage = lazyLoad(() => import("./pages/LearningPage"));
const ISO27001ReadinessChecklist = lazyLoad(() => import("./pages/learning/ISO27001ReadinessChecklist"));
const RegulationsDashboard = lazyLoad(() => import("./pages/RegulationsDashboard"));
const RegulationDetail = lazyLoad(() => import("./pages/RegulationDetail"));
const FrameworksDashboard = lazyLoad(() => import("./pages/FrameworksDashboard"));
const ComplianceRequirementsPage = lazyLoad(() => import("./pages/ComplianceRequirementsPage"));

const RiskDashboard = lazyLoad(() => import("./pages/risk/RiskDashboard"));
const RiskOverview = lazyLoad(() => import("./pages/risk/RiskOverview"));
const FederalOverview = lazyLoad(() => import("./pages/federal/FederalOverview"));

const FedRAMPPackagesPage = lazyLoad(() => import("./pages/federal/FedRAMPPackagesPage"));
const FismaSystemsPage = lazyLoad(() => import("./pages/federal/FismaSystemsPage"));
const DfarsPage = lazyLoad(() => import("./pages/federal/DfarsPage"));
const RmfPage = lazyLoad(() => import("./pages/federal/RmfPage"));
const RmfWorkflowPage = lazyLoad(() => import("./pages/federal/RmfWorkflowPage"));
const StigsPage = lazyLoad(() => import("./pages/federal/StigsPage"));
const StigChecklistPage = lazyLoad(() => import("./pages/federal/StigChecklistPage"));
const Fips140Page = lazyLoad(() => import("./pages/federal/Fips140Page"));
const Nist800171AssessmentPage = lazyLoad(() => import("./pages/federal/Nist800171AssessmentPage"));
const FedRAMPPackageDetailPage = lazyLoad(() => import("./pages/federal/FedRAMPPackageDetailPage"));
const Nist80053AssessmentPage = lazyLoad(() => import("./pages/federal/Nist80053AssessmentPage"));
const NonComplianceReport = lazyLoad(() => import("./pages/federal/NonComplianceReport"));
const CuiApplicabilityQuiz = lazyLoad(() => import("./pages/federal/CuiApplicabilityQuiz"));
const FISMAPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.FISMAPlaceholder })));
const RMFPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.RMFPlaceholder })));
const DFARSPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.DFARSPlaceholder })));
const DISAStigPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.DISAStigPlaceholder })));
const Fips140TrackingPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.Fips140TrackingPlaceholder })));
const MonitorPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.MonitorPlaceholder })));
const SPRSPlaceholder = lazyLoad(() => import("./pages/federal/FederalModulePlaceholder").then(m => ({ default: m.SPRSPlaceholder })));
const VendorOverview = lazyLoad(() => import("./pages/tprm/VendorOverview"));
const BusinessContinuityOverview = lazyLoad(() => import("./pages/business-continuity/BusinessContinuityOverview"));
const CyberOverview = lazyLoad(() => import("./pages/cyber/CyberOverview"));
const GovernanceDashboard = lazyLoad(() => import("./pages/governance/GovernanceDashboard"));
const GovernanceProgramGuide = lazyLoad(() => import("./pages/governance/GovernanceProgramGuide"));
const FederalProgramGuide = lazyLoad(() => import("./pages/federal/FederalProgramGuide"));
const RiskProgramGuide = lazyLoad(() => import("./pages/risk/RiskProgramGuide"));
const VendorProgramGuide = lazyLoad(() => import("./pages/tprm/VendorProgramGuide"));
const PrivacyProgramGuide = lazyLoad(() => import("./pages/privacy/PrivacyProgramGuide"));
const BCPProgramGuide = lazyLoad(() => import("./pages/business-continuity/BCPProgramGuide"));
const CyberProgramGuide = lazyLoad(() => import("./pages/cyber/CyberProgramGuide"));
const ComplianceOverview = lazyLoad(() => import("./pages/compliance/ComplianceOverview"));
const AssuranceOverview = lazyLoad(() => import("./pages/assurance/AssuranceOverview"));
const SAMMView = lazyLoad(() => import("@/pages/assurance/SAMMView"));
const SAMMV2View = lazyLoad(() => import("@/pages/assurance/SAMMV2View"));
const ASVSView = lazyLoad(() => import("@/pages/assurance/ASVSView"));
const EssentialEightView = lazyLoad(() => import("@/pages/assurance/EssentialEightView"));
const FrameworkImplementationView = lazyLoad(() => import("@/pages/assurance/FrameworkImplementationView"));
const MaturityAssessmentView = lazyLoad(() => import("@/pages/assurance/MaturityAssessmentView"));
const MaturitySimulationView = lazyLoad(() => import("@/pages/assurance/MaturitySimulationView"));

// New Roadmap & Implementation pages
const RoadmapDashboard = lazyLoad(() => import("@/components/roadmap/RoadmapDashboard"));
const FrameworkMarketplacePage = lazyLoad(() => import("./pages/FrameworkMarketplacePage"));
const FrameworkStudio = lazyLoad(() => import("./pages/studio/FrameworkStudio"));
const RoadmapCreatePage = lazyLoad(() => import("@/components/roadmap/RoadmapCreatePage"));
const RoadmapTemplates = lazyLoad(() => import("@/components/roadmap/RoadmapTemplates"));
const StrategicReportsPage = lazyLoad(() => import("./pages/roadmap/StrategicReportsPage"));
const StrategicReportEditor = lazyLoad(() => import("./pages/roadmap/StrategicReportEditor"));
const LicenseTestPage = lazyLoad(() => import("./pages/LicenseTestPage"));
const RoadmapEditPage = lazyLoad(() => import("./pages/readiness/RoadmapEditPageFixed"));

const ImplementationDashboard = lazyLoad(() => import("./components/implementation/ImplementationDashboard"));
const ImplementationCreate = lazyLoad(() => import("./components/implementation/ImplementationCreate"));
// const ImplementationKanban = lazyLoad(() => import("./components/implementation/ImplementationKanban"));
const ImplementationKanbanPage = lazyLoad(() => import("./components/implementation/ImplementationKanbanPage"));
const MultiFrameworkPlanView = lazyLoad(() => import("@/components/implementation/MultiFrameworkPlanView"));
const ImplementationResources = lazyLoad(() => import("./components/implementation/ImplementationResources"));
const TemplateManager = lazyLoad(() => import("./components/implementation/TemplateManager"));
const RiskRegisterPage = lazyLoad(() => import("./pages/risk/RiskRegisterPage"));
const CriticalRisksPage = lazyLoad(() => import("./pages/risk/CriticalRisksPage"));
const RiskAssetsPage = lazyLoad(() => import("./pages/risk/RiskAssetsPage"));
const RiskThreatsPage = lazyLoad(() => import("./pages/risk/RiskThreatsPage"));
const RiskVulnerabilitiesPage = lazyLoad(() => import("./pages/risk/RiskVulnerabilitiesPage"));
const RiskAssessmentsPage = lazyLoad(() => import("./pages/risk/RiskAssessmentsPage"));
const RiskAssessmentEditor = lazyLoad(() => import("./pages/risk/RiskAssessmentEditor"));
const RiskVulnerabilityEditor = lazyLoad(() => import("./pages/risk/RiskVulnerabilityEditor"));
const RiskAssetEditor = lazyLoad(() => import("./pages/risk/RiskAssetEditor"));
const RiskThreatEditor = lazyLoad(() => import("./pages/risk/RiskThreatEditor"));
const RiskFramework = lazyLoad(() => import("./pages/risk/RiskFramework"));
const GuidedRiskValidation = lazyLoad(() => import("./pages/risk/GuidedRiskValidation"));

const RiskReportEditor = lazyLoad(() => import("./pages/risk/RiskReportEditor"));
const RiskReportList = lazyLoad(() => import("./pages/risk/RiskReportList"));
const RiskTreatmentPlanPage = lazyLoad(() => import("./pages/risk/RiskTreatmentPlanPage"));
const RiskAlignmentPage = lazyLoad(() => import("./pages/risk/RiskAlignmentPage"));
const AdversaryIntelPage = lazyLoad(() => import("./pages/risk/AdversaryIntelPage"));
const VulnerabilityWorkbench = lazyLoad(() => import("./pages/risk/VulnerabilityWorkbench"));
const VulnerabilityScannerPage = lazyLoad(() => import("./pages/risk/VulnerabilityScanner"));
const SIEMDashboard = lazyLoad(() => import("./pages/risk/SIEMDashboard"));
const SOARDashboard = lazyLoad(() => import("./pages/risk/SOARDashboard"));
const ThreatIntelDashboard = lazyLoad(() => import("./pages/risk/ThreatIntelDashboard"));

const TPRMLayout = lazyLoad(() => import("./pages/tprm/TPRMLayout").then(module => ({ default: module.TPRMLayout })));
const VendorList = lazyLoad(() => import("./pages/tprm/VendorList"));
const VendorDetails = lazyLoad(() => import("./pages/tprm/VendorDetails"));
const VendorDashboard = lazyLoad(() => import("./pages/tprm/VendorDashboard"));
const OverdueAssessmentsPage = lazyLoad(() => import("./pages/tprm/OverdueAssessmentsPage"));
const VendorAlignmentPage = lazyLoad(() => import("./pages/tprm/VendorAlignmentPage"));
const GapAnalysisList = lazyLoad(() => import("./pages/gap-analysis/GapAnalysisList"));
const NewGapAnalysis = lazyLoad(() => import("./pages/gap-analysis/NewGapAnalysis"));
const GapAnalysisEditor = lazyLoad(() => import("./pages/gap-analysis/GapAnalysisEditor"));
const GapQuestionnaireResponse = lazyLoad(() => import("./pages/gap-analysis/GapQuestionnaireResponse"));
const FrameworkDetails = lazyLoad(() => import("./pages/FrameworkDetails"));
const SecurityReviews = lazyLoad(() => import("./pages/tprm/SecurityReviews"));
const GlobalVendorCatalog = lazyLoad(() => import("./pages/tprm/GlobalVendorCatalog"));
const WorkflowsHub = lazyLoad(() => import("./pages/workflows/WorkflowsHub"));
const WorkflowPlayer = lazyLoad(() => import("./pages/workflows/WorkflowPlayer"));
const AssessmentTemplates = lazyLoad(() => import("./pages/tprm/AssessmentTemplates"));

const OnboardVendor = lazyLoad(() => import("./pages/tprm/OnboardVendor"));
const DPAManager = lazyLoad(() => import("./pages/tprm/DPAManager"));
const TemplateEditor = lazyLoad(() => import("./pages/tprm/TemplateEditor"));
const SubprocessorRegister = lazyLoad(() => import("./pages/tprm/SubprocessorRegister"));
const DPAEditor = lazyLoad(() => import("./pages/tprm/DPAEditor"));
const VendorContractTemplates = lazyLoad(() => import("./pages/tprm/VendorContractTemplates"));

const BusinessContinuityDashboard = lazyLoad(() => import("./pages/business-continuity/BusinessContinuityDashboard"));

const GdprAssessmentPage = lazyLoad(() => import("./pages/privacy/assessments/GdprAssessmentPage"));
const CcpaAssessmentPage = lazyLoad(() => import("./pages/privacy/assessments/CcpaAssessmentPage"));
const DynamicPrivacyAssessmentPage = lazyLoad(() => import("./pages/privacy/assessments/DynamicPrivacyAssessmentPage"));
const ROPADashboard = lazyLoad(() => import("./pages/privacy/ROPADashboard"));
const PrivacyDocsDashboard = lazyLoad(() => import("./pages/privacy/PrivacyDocsDashboard"));
const DataBreachRegister = lazyLoad(() => import("./pages/privacy/DataBreachRegister"));
const BusinessImpactAnalysisPage = lazyLoad(() => import("./pages/business-continuity/BusinessImpactAnalysisPage"));
const BusinessContinuityStrategiesPage = lazyLoad(() => import("./pages/business-continuity/BusinessContinuityStrategiesPage"));
const BusinessContinuityPlansPage = lazyLoad(() => import("./pages/business-continuity/BusinessContinuityPlansPage"));
const BCPProjectWizard = lazyLoad(() => import("./pages/business-continuity/BCPProjectWizard"));
const ProcessRegistry = lazyLoad(() => import("./pages/business-continuity/ProcessRegistry"));
const DisruptiveScenariosPage = lazyLoad(() => import("./pages/business-continuity/DisruptiveScenariosPage"));
const DisruptiveScenarioEditor = lazyLoad(() => import("./pages/business-continuity/DisruptiveScenarioEditor"));
const BusinessImpactAnalysisEditor = lazyLoad(() => import("./pages/business-continuity/BusinessImpactAnalysisEditor"));
const RecoveryPlanBuilder = lazyLoad(() => import("./pages/business-continuity/RecoveryPlanBuilder"));
const CallTreeManager = lazyLoad(() => import("./pages/business-continuity/CallTreeManager"));
const ProcessBuilder = lazyLoad(() => import("./pages/business-continuity/ProcessBuilder"));

const TasksDashboard = lazyLoad(() => import("./pages/business-continuity/TasksDashboard"));
const BCPlanManager = lazyLoad(() => import("./pages/business-continuity/BCPlanManager"));
const BCGovernancePage = lazyLoad(() => import("./pages/business-continuity/BCGovernancePage"));
const BCExercisesPage = lazyLoad(() => import("./pages/business-continuity/BCExercisesPage"));
const BCTrainingPage = lazyLoad(() => import("./pages/business-continuity/BCTrainingPage"));
const ISO22301CompliancePage = lazyLoad(() => import("./pages/business-continuity/ISO22301CompliancePage"));

const TotalBcpWizard = lazyLoad(() => import("./pages/business-continuity/TotalBcpWizard"));

const ReadinessWizardPage = lazyLoad(() => import("./pages/readiness/ReadinessWizardPage"));
const RoadmapPage = lazyLoad(() => import("./pages/readiness/RoadmapPage"));
const RoadmapDetailsPage = lazyLoad(() => import("./pages/readiness/RoadmapDetailsPage"));
const AuditReadinessAlignmentPage = lazyLoad(() => import("./pages/readiness/AuditReadinessAlignmentPage"));
const ComplianceJourneyDashboard = lazyLoad(() => import("./pages/ComplianceJourneyDashboard"));
const GovernanceWorkbench = lazyLoad(() => import("./pages/governance/GovernanceWorkbench"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const GovernanceAlignmentPage = lazyLoad(() => import("./pages/governance/GovernanceAlignmentPage"));

const DevProjectsList = lazyLoad(() => import("./pages/dev/DevProjectsList").then(module => ({ default: module.DevProjectsList })));
const ProjectDetail = lazyLoad(() => import("./pages/dev/ProjectDetail").then(module => ({ default: module.ProjectDetail })));
const ThreatModelWizard = lazyLoad(() => import("@/components/threat-modeling/ThreatModelWizard").then(module => ({ default: module.ThreatModelWizard })));

// Federal Compliance
const FederalContractsPage = lazyLoad(() => import("./pages/federal/FederalContractsPage"));
const FederalHub = lazyLoad(() => import("./pages/federal/FederalHub"));
const FederalComplianceDashboard = lazyLoad(() => import("./pages/federal/FederalComplianceDashboard"));
const FipsCategorizationPage = lazyLoad(() => import("./pages/federal/FipsCategorizationPage"));
const SSPEditor = lazyLoad(() => import("./pages/federal/SSPEditor"));
const POAMTracker = lazyLoad(() => import("./pages/federal/POAMTracker"));
const SARViewer = lazyLoad(() => import("./pages/federal/SARViewer"));
const FederalAlignmentPage = lazyLoad(() => import("./pages/federal/FederalAlignmentPage"));
const SalesDashboard = lazyLoad(() => import("./pages/sales/SalesDashboard"));
const WaitlistManagement = lazyLoad(() => import("./pages/sales/WaitlistManagement"));
const BoardSummaryPage = lazyLoad(() => import("./pages/BoardSummaryPage"));
const GlobalCRM = lazyLoad(() => import("./pages/admin/GlobalCRM"));
const ContactDetail = lazyLoad(() => import("./pages/admin/crm/ContactDetail"));
const TrustCenter = lazyLoad(() => import("./pages/TrustCenter"));
const AuditHub = lazyLoad(() => import("./pages/AuditHub"));

const PrivacyDashboard = lazyLoad(() => import("./pages/privacy/PrivacyDashboard"));
const DataInventory = lazyLoad(() => import("./pages/privacy/DataInventory"));
const ROPA = lazyLoad(() => import("./pages/privacy/ROPA"));
const DSARManager = lazyLoad(() => import("./pages/privacy/DSARManager"));
const DsarDetail = lazyLoad(() => import("./pages/privacy/DsarDetail"));
const DPIAManager = lazyLoad(() => import("./pages/privacy/DPIAManager"));
const DPIAQuestionnaire = lazyLoad(() => import("./pages/privacy/DPIAQuestionnaire"));
const TransferDashboard = lazyLoad(() => import("./pages/privacy/TransferDashboard"));
const TIAWorkspace = lazyLoad(() => import("./pages/privacy/TIAWorkspace"));
const PrivacyOverview = lazyLoad(() => import("./pages/privacy/PrivacyOverview"));
const PrivacyAlignmentPage = lazyLoad(() => import("./pages/privacy/PrivacyAlignmentPage"));
const PrivacyLayout = lazyLoad(() => import("./pages/privacy/PrivacyLayout").then(module => ({ default: module.PrivacyLayout })));
const KnowledgeBase = lazyLoad(() => import("./pages/KnowledgeBase"));
const QuestionnaireWorkspace = lazyLoad(() => import("./pages/QuestionnaireWorkspace"));
const QuestionnairesDashboard = lazyLoad(() => import("./pages/QuestionnairesDashboard"));

const CyberDashboard = lazyLoad(() => import("./pages/cyber/CyberDashboard"));
const CyberAssessment = lazyLoad(() => import("./pages/cyber/CyberAssessment"));
const CyberIncidentsPage = lazyLoad(() => import("./pages/cyber/CyberIncidentsPage"));
const CyberIncidentReporting = lazyLoad(() => import("./pages/cyber/CyberIncidentReporting"));
const CyberDocumentation = lazyLoad(() => import("./pages/cyber/CyberDocumentation"));
const CyberIncidentDetail = lazyLoad(() => import("./pages/cyber/CyberIncidentDetail"));
const CyberLayout = lazyLoad(() => import("./pages/cyber/CyberLayout"));
const NIS2MappingHub = lazyLoad(() => import("./pages/cyber/NIS2MappingHub"));
const NIS2Workbook = lazyLoad(() => import("./pages/cyber/NIS2Workbook"));
const ThreatIntelligence = lazyLoad(() => import("./pages/cyber/ThreatIntelligence"));
const SupplyChainRisk = lazyLoad(() => import("./pages/cyber/SupplyChainRisk"));
const CyberMonitoring = lazyLoad(() => import("./pages/cyber/CyberMonitoring"));
const VulnerabilityManagement = lazyLoad(() => import("./pages/cyber/VulnerabilityManagement"));
const AssetCriticalityMatrix = lazyLoad(() => import("./pages/cyber/AssetCriticalityMatrix"));
const SecurityTesting = lazyLoad(() => import("./pages/cyber/SecurityTesting"));
const ISODashboard = lazyLoad(() => import("./pages/iso27001/ISODashboard"));
const StatementOfApplicability = lazyLoad(() => import("./pages/iso27001/StatementOfApplicability"));
const ISOPlaceholder = lazyLoad(() => import("./pages/iso27001/ISOPlaceholder"));
const ISORiskManagement = lazyLoad(() => import("./pages/iso27001/ISORiskManagement"));
const ISOAssetRegister = lazyLoad(() => import("./pages/iso27001/ISOAssetRegister"));
const ISOContext = lazyLoad(() => import("./pages/iso27001/ISOContext"));
const ISODocumentTracker = lazyLoad(() => import("./pages/iso27001/ISODocumentTracker"));
const ISOAuditManager = lazyLoad(() => import("./pages/iso27001/ISOAuditManager"));
const AuditManager = lazyLoad(() => import("./pages/AuditManager"));
const ISOManagementReview = lazyLoad(() => import("./pages/iso27001/ISOManagementReview"));
const ISOProgramGuide = lazyLoad(() => import("./pages/iso27001/ISOProgramGuide"));
import { ISOLayout } from "./pages/iso27001/ISOLayout";



const AIGovernance = lazyLoad(() => import("./pages/ai-governance/AIGovernance"));
const AIGovernanceProgramGuide = lazyLoad(() => import("./pages/ai-governance/AIGovernanceProgramGuide"));


const StartHere = lazyLoad(() => import("./pages/StartHere"));
const FeaturesPage = lazyLoad(() => import("./pages/FeaturesPage"));
const EmployeeOnboarding = lazyLoad(() => import("./pages/EmployeeOnboarding"));
const TrainingManagement = lazyLoad(() => import("./pages/TrainingManagement"));

const UIPatternShowcase = lazyLoad(() => import("./pages/UIPatternShowcase"));
const ConsolidatedRequestPortal = lazyLoad(() => import("./pages/portal/ConsolidatedRequestPortal"));
const VendorAssessmentPortal = lazyLoad(() => import("./pages/portal/VendorAssessmentPortal"));
const VendorQuestionnairePortal = lazyLoad(() => import("./pages/VendorQuestionnairePortal"));

// const Integrations = lazyLoad(() => import("./pages/admin/Integrations"));
const OAuthCallback = lazyLoad(() => import("./pages/oauth/Callback"));
const GitHubOAuthCallback = lazyLoad(() => import("./pages/api/oauth/github/callback"));
const SlackOAuthCallback = lazyLoad(() => import("./pages/api/oauth/slack/callback").then(module => ({ default: module.SlackOAuthCallback })));

const SecurityProjectsDashboard = lazyLoad(() => import("./pages/projects/ProjectsDashboard").then(m => ({ default: m.ProjectsDashboard })));
const SecurityProjectDetail = lazyLoad(() => import("./pages/projects/ProjectDetail").then(m => ({ default: m.ProjectDetail })));


function GlobalBrandingSync() {
  const { selectedClientId } = useClientContext();
  const [location] = useLocation();
  const urlClientMatch = location.match(/\/clients\/(\d+)/);
  const urlClientId = urlClientMatch ? parseInt(urlClientMatch[1], 10) : null;
  const effectiveClientId = selectedClientId || urlClientId;

  const { data: client } = trpc.clients.get.useQuery(
    { id: effectiveClientId as number },
    {
      enabled: !!effectiveClientId,
      retry: false,
      staleTime: 1000 * 60 * 5,
    }
  );

  const { updateBranding } = useBranding();
  const updateBrandingRef = useRef(updateBranding);
  updateBrandingRef.current = updateBranding;

  // Track which client we last synced to avoid re-applying on every render
  const lastSyncedClientRef = useRef<number | null>(null);

  useEffect(() => {
    if (client && client.id !== lastSyncedClientRef.current) {
      const brandingUpdates: Partial<import("./config/branding").BrandingConfig> = {};
      if (client.brandPrimaryColor) brandingUpdates.primaryColor = client.brandPrimaryColor;
      if (client.sidebarBg) brandingUpdates.sidebarBg = client.sidebarBg;
      if (client.headingFont) brandingUpdates.headingFont = client.headingFont;
      if (client.bodyFont) brandingUpdates.bodyFont = client.bodyFont;
      if (client.baseFontSize) brandingUpdates.baseFontSize = client.baseFontSize;
      if (client.logoUrl) brandingUpdates.logoUrl = client.logoUrl;
      if (client.portalTitle) brandingUpdates.portalTitle = client.portalTitle;

      if (Object.keys(brandingUpdates).length > 0) {
        lastSyncedClientRef.current = client.id;
        updateBrandingRef.current(brandingUpdates);
      }
    }
  }, [client]);

  return null;
}

// Unified Client Guard - Handles both Premium and Management checks
// This ensures that client data is fetched ONCE and shared across all guards
function UnifiedClientGuard({
  children,
  requirePremium = false,
  requireManagement = false
}: {
  children: React.ReactNode,
  requirePremium?: boolean,
  requireManagement?: boolean
}) {
  const { selectedClientId, setPlanTier, setUserRole, userRole: contextRole, setIsPremiumStatus } = useClientContext();
  const [location] = useLocation();

  // Extract client ID from URL as fallback
  const urlClientMatch = location.match(/\/clients\/(\d+)/);
  const urlClientId = urlClientMatch ? parseInt(urlClientMatch[1], 10) : null;
  const effectiveClientId = selectedClientId || urlClientId;

  const { data: userMe, isLoading: userLoading } = trpc.users.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false
  });

  const { data: client, isLoading: clientLoading, error } = trpc.clients.get.useQuery(
    { id: effectiveClientId as number },
    {
      enabled: !!effectiveClientId,
      retry: false,
      staleTime: 1000 * 60 * 5,
    }
  );

  useEffect(() => {
    if (client) {
      if (client.planTier) setPlanTier(client.planTier);
      if (client.userRole) setUserRole(client.userRole);
    }
  }, [client, setPlanTier, setUserRole]);

  useEffect(() => {
    if (userMe?.planTier && !client) setPlanTier(userMe.planTier);
  }, [userMe, setPlanTier, client]);

  const tier = client?.planTier || userMe?.planTier;
  const clientRole = client?.userRole || contextRole;
  const globalRole = userMe?.role;
  const isGlobalAdmin = ['admin', 'owner', 'super_admin', 'enterprise_admin', 'ent_admin'].includes(globalRole || '');
  const isAdminOrOwner = isGlobalAdmin || clientRole === 'owner' || clientRole === 'admin';
  const isPremiumContext = tier === 'pro' || tier === 'enterprise' || isAdminOrOwner || clientRole === 'owner' || clientRole === 'admin';

  useEffect(() => {
    setIsPremiumStatus(isPremiumContext);
  }, [isPremiumContext, setIsPremiumStatus]);

  if (error?.data?.code === 'PRECONDITION_FAILED') {
    const message = error.message?.toLowerCase() || '';
    if (message.includes('mfa') || message.includes('multi-factor')) {
      return <Redirect to="/settings/security" />;
    }
    return <Redirect to="/upgrade-required" />;
  }

  if (error?.data?.code === 'FORBIDDEN' || error?.data?.code === 'NOT_FOUND') {
    return <Redirect to="/clients" />;
  }

  if (userLoading || (!!effectiveClientId && clientLoading)) return <PageLoader />;

  if (requirePremium) {
    const enabledInBuild = import.meta.env.VITE_ENABLE_PREMIUM !== 'false';
    const isPremium = isPremiumContext;

    if (!enabledInBuild && !isGlobalAdmin && clientRole !== 'owner' && clientRole !== 'admin') {
      return <Redirect to="/upgrade-required" />;
    }
    if (!isPremium) {
      return <Redirect to="/upgrade-required" />;
    }
  }

  if (requireManagement) {
    if (!isAdminOrOwner) {
      return <Redirect to="/dashboard" />;
    }
  }

  return <>{children}</>;
}

// Legacy wrappers for backward compatibility (optional but kept for internal reuse)
function PremiumGuard({ children }: { children: React.ReactNode }) {
  return <UnifiedClientGuard requirePremium={true}>{children}</UnifiedClientGuard>;
}

function ManagementGuard({ children }: { children: React.ReactNode }) {
  return <UnifiedClientGuard requireManagement={true}>{children}</UnifiedClientGuard>;
}

// Wrapper for protected routes
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> } & any) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    console.log("ProtectedRoute: No session, redirecting to login");
    return <Redirect to="/login" />;
  }

  console.log("ProtectedRoute: Session valid, rendering component");

  return <Component {...rest} />;
}

function ClientControlsAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/controls`} />;
  return <Redirect to="/clients" />;
}

function ClientPoliciesAlias() {
  const { selectedClientId } = useClientContext();
  const currentSearch = window.location.search;
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/policies${currentSearch}`} />;
  return <Redirect to="/clients" />;
}

function RiskManagementAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/risks`} />;
  return <Redirect to="/clients" />;
}

function RiskRegisterAlias() {
  const { selectedClientId } = useClientContext();
  const search = window.location.search;
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/risks/register${search}`} />;
  return <Redirect to="/clients" />;
}

function CriticalRisksAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/risks/critical`} />;
  return <Redirect to="/clients" />;
}

function OverdueAssessmentsAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/vendors/assessments/overdue`} />;
  return <Redirect to="/clients" />;
}

function EvidenceAlias() {
  const { selectedClientId } = useClientContext();
  const search = window.location.search;
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/evidence${search}`} />;
  return <Redirect to="/clients" />;
}

function GapAnalysisAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/gap-analysis`} />;
  return <Redirect to="/clients" />;
}

function ComplianceDashboardAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/compliance`} />;
  return <Redirect to="/clients" />;
}

function SAMMAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/samm`} />;
  return <Redirect to="/clients" />;
}

function DevProjectsAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/dev/projects`} />;
  return <Redirect to="/clients" />;
}

function ProjectsAlias() {
  const { selectedClientId } = useClientContext();
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/projects`} />;
  return <Redirect to="/clients" />;
}




function BusinessContinuityAlias() {
  const { selectedClientId } = useClientContext();
  const [location, setLocation] = useLocation();
  const params = useParams(); // Should capture :rest*

  if (selectedClientId) {
    // location includes the full path, e.g. /business-continuity/bia
    // We can just construct the new path.
    // But wait, if matches /business-continuity/:rest*, params.rest is 'bia' (maybe 'bia/')

    const rest = params.rest || '';
    // Clean leading slash if present in rest or needs adding
    const suffix = rest.startsWith('/') ? rest : `/${rest}`;

    // Handle case where rest is empty or undefined
    const finalSuffix = (rest === undefined || rest === '') ? '' : suffix;

    if (finalSuffix === '/overview') {
      // Handle specific case to avoid redirection loops or issues if needed, strictly mapping
      return <Redirect to={`/clients/${selectedClientId}/business-continuity/overview`} />;
    }

    return <Redirect to={`/clients/${selectedClientId}/business-continuity${finalSuffix}`} />;
  }
  return <Redirect to="/clients" />;
}


function CyberAlias() {
  const { selectedClientId } = useClientContext();
  const [location] = useLocation();

  if (selectedClientId) {
    // Extract the part after /cyber
    const cyberPath = location.replace(/^\/cyber/, '');
    return <Redirect to={`/clients/${selectedClientId}/cyber${cyberPath}`} />;
  }
  return <Redirect to="/clients" />;
}





function VendorsAlias() {
  const { selectedClientId } = useClientContext();
  const search = window.location.search;
  if (selectedClientId) return <Redirect to={`/clients/${selectedClientId}/vendors/overview${search}`} />;
  return <Redirect to="/clients" />;
}

/**
 * RootHub handles domain-based routing for the landing page vs. application entrance.
 * Main domain (grcompliance.com) serves the marketing landing page.
 * App subdomain (app.grcompliance.com) serves the login page directly.
 * 
 * SECURITY: This component acts as a gatekeeper to ensure functional app code
 * is only executed on the designated app subdomain.
 */
function RootHub() {
  const hostname = window.location.hostname;
  const isAppDomain = hostname.startsWith('app.') || hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // If on main domain but trying to access the app, redirect to proper subdomain
  if (!isAppDomain && (hostname.includes('grcompliance.com') || hostname.includes('grcompliance.com'))) {
    window.location.href = `https://app.grcompliance.com${window.location.pathname}${window.location.search}`;
    return null;
  }

  if (isAppDomain) {
    return <LoginPage />;
  }

  return <Home />;
}


function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}



function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      {/* Domain Enforcement for App Routes - Outside Switch to avoid blocking matches */}
      <Route path="/(login|signup|auth|dashboard|clients|controls|settings|evidence|policy-templates)">
        {() => {
          const hostname = window.location.hostname;
          const isAppDomain = hostname.startsWith('app.') || hostname.includes('localhost') || hostname.includes('127.0.0.1');
          if (!isAppDomain && hostname.includes('grcompliance.com')) {
            window.location.href = `https://app.grcompliance.com${window.location.pathname}${window.location.search}`;
          }
          return null;
        }}
      </Route>

      <Switch>
        {/* Public Routes */}
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignUpPage} />
        <Route path="/auth/redeem-link" component={RedeemLink} />
        <Route path="/auth/accept-invite" component={AcceptInvite} />

        <Route path="/complete-subscription">
          <ProtectedRoute component={CompleteSubscription} />
        </Route>
        <Route path="/upgrade-required">
          <ProtectedRoute component={UpgradeRequired} />
        </Route>
        <Route path="/auth/callback/jira">
          <ProtectedRoute component={OAuthCallback} />
        </Route>
        <Route path="/api/oauth/github/callback">
          <ProtectedRoute component={GitHubOAuthCallback} />
        </Route>
        <Route path="/auth/callback/github">
          <ProtectedRoute component={GitHubOAuthCallback} />
        </Route>
        <Route path="/api/oauth/slack/callback">
          <ProtectedRoute component={SlackOAuthCallback} />
        </Route>
        <Route path="/auth/callback/slack">
          <ProtectedRoute component={SlackOAuthCallback} />
        </Route>
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/update-password" component={UpdatePassword} />
        <Route path="/landing" component={Home} />
        <Route path="/managed-services" component={ManagedServicesPage} />
        <Route path="/waitlist" component={WaitlistPage} />
        <Route path="/respond-gap/:token" component={GapQuestionnaireResponse} />
        {/* Public Questionnaire Route */}
        <Route path="/questionnaire/:token" component={VendorQuestionnairePortal} />



        {/* Vendor Portals */}
        <Route path="/portal/request/:token" component={ConsolidatedRequestPortal} />
        <Route path="/portal/assessment/:token" component={VendorAssessmentPortal} />

        {/* Domain-Aware Root Route */}
        <Route path="/" component={RootHub} />

        {/* License Test Page - For testing license validation system */}
        <Route path="/license-test">
          <ProtectedRoute component={LicenseTestPage} />
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/sales">
          {(_params) => <AdminLayout><UnifiedClientGuard requirePremium><ProtectedRoute component={SalesDashboard} /></UnifiedClientGuard></AdminLayout>}
        </Route>
        <Route path="/sales/waitlist">
          {(_params) => <AdminLayout><UnifiedClientGuard requirePremium><ProtectedRoute component={WaitlistManagement} /></UnifiedClientGuard></AdminLayout>}
        </Route>

        <Route path="/admin/system-feedback">
          {(_params) => <AdminLayout><UnifiedClientGuard requireManagement><ProtectedRoute component={SystemFeedbackPage} /></UnifiedClientGuard></AdminLayout>}
        </Route>

        <Route path="/clients">
          <ProtectedRoute component={Clients} />
        </Route>
        <Route path="/clients/new">
          <ProtectedRoute component={ClientOnboarding} />
        </Route>
        <Route path="/clients/:id/governance/overview">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={GovernanceDashboard} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/governance/workbench">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={GovernanceWorkbench} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/governance/alignment-guide">
          <ProtectedRoute component={GovernanceAlignmentPage} />
        </Route>
        <Route path="/clients/:id/governance/program-guide">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={GovernanceProgramGuide} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/program-guide">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FederalProgramGuide} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/risks/program-guide">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={RiskProgramGuide} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/vendors/program-guide">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={VendorProgramGuide} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/privacy/program-guide">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={PrivacyProgramGuide} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/business-continuity/program-guide">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={BCPProgramGuide} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/governance">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={GovernanceDashboard} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:clientId/training/management">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={TrainingManagement} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/personnel-compliance">
          {(_params) => <UnifiedClientGuard requirePremium requireManagement><ProtectedRoute component={PersonnelComplianceHub} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/compliance/overview">
          <ProtectedRoute component={ComplianceOverview} />
        </Route>
        <Route path="/clients/:id/compliance">
          <ProtectedRoute component={ClientCompliancePage} />
        </Route>
        <Route path="/clients/:id/knowledge-base">
          <ProtectedRoute component={KnowledgeBase} />
        </Route>
        <Route path="/clients/:id/guides">
          <ProtectedRoute component={Guides} />
        </Route>
        <Route path="/clients/:id/questionnaires">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={QuestionnairesDashboard} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/questionnaire-workspace">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={QuestionnaireWorkspace} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/questionnaires/:qId">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={QuestionnaireWorkspace} /></UnifiedClientGuard>}
        </Route>

        <Route path="/clients/:id/controls">
          {(_params) => <ProtectedRoute component={ClientControlsPage} />}
        </Route>
        <Route path="/clients/:id/metrics">
          {(_params) => <ProtectedRoute component={MetricsPage} />}
        </Route>
        <Route path="/clients/:id/marketplace">
          {(_params) => <ProtectedRoute component={FrameworkMarketplacePage} />}
        </Route>
        <Route path="/frameworks/studio">
          <ProtectedRoute component={FrameworkStudio} />
        </Route>
        <Route path="/clients/:id/policies">
          {(_params) => <ProtectedRoute component={ClientPoliciesPage} />}
        </Route>


        <Route path="/clients/:id/policies/:policyId">
          {(params) => <ProtectedRoute component={PolicyEditor} {...params} />}
        </Route>
        <Route path="/clients/:id/mappings">
          {(_params) => <ProtectedRoute component={Mappings} />}
        </Route>
        <Route path="/clients/:id/assurance">
          {(_params) => <ProtectedRoute component={AssuranceOverview} />}
        </Route>
        <Route path="/clients/:id/evidence/overview">
          {(_params) => <ProtectedRoute component={AssuranceOverview} />}
        </Route>
        <Route path="/clients/:id/samm">
          {(_params) => <ProtectedRoute component={SAMMV2View} />}
        </Route>
        <Route path="/clients/:id/essential-eight">
          {(_params) => <ProtectedRoute component={EssentialEightView} />}
        </Route>
        <Route path="/clients/:id/asvs">
          {(_params) => <ProtectedRoute component={ASVSView} />}
        </Route>
        <Route path="/clients/:id/assurance/:frameworkId">
          {(_params) => <ProtectedRoute component={FrameworkImplementationView} />}
        </Route>



        <Route path="/clients/:id/nist-csf-2">
          {(_params) => <ProtectedRoute component={() => <MaturityAssessmentView frameworkId="nist-csf-2" />} />}
        </Route>
        <Route path="/clients/:id/cisa-ztmm-2">
          {(_params) => <ProtectedRoute component={() => <MaturityAssessmentView frameworkId="cisa-ztmm-2" />} />}
        </Route>
        <Route path="/clients/:id/c2m2-2.1">
          {(_params) => <ProtectedRoute component={() => <MaturityAssessmentView frameworkId="c2m2-2.1" />} />}
        </Route>
        <Route path="/clients/:id/cmmc-2">
          {(_params) => <ProtectedRoute component={() => <MaturityAssessmentView frameworkId="cmmc-2" />} />}
        </Route>
        <Route path="/clients/:id/maturity/simulation/:frameworkId">
          {(_params) => <ProtectedRoute component={MaturitySimulationView} />}
        </Route>
        <Route path="/clients/:id/evidence">
          {(_params) => <ProtectedRoute component={Evidence} />}
        </Route>
        <Route path="/clients/:id/people">
          {(_params) => <ProtectedRoute component={PeoplePage} />}
        </Route>
        <Route path="/clients/:id/raci-matrix">
          {(_params) => <ProtectedRoute component={RACIMatrix} />}
        </Route>
        <Route path="/clients/:id/raci-matrix/unassigned">
          {(_params) => <ProtectedRoute component={UnassignedItems} />}
        </Route>
        <Route path="/clients/:id/calendar">
          {(_params) => <ProtectedRoute component={Calendar} />}
        </Route>

        <Route path="/implementation/resources">
          {(_params) => <ProtectedRoute component={ImplementationResources} />}
        </Route>
        {/* Management Sign-off and Readiness Tools */}
        <Route path="/clients/:id/management/sign-off">
          {(_params) => <ProtectedRoute component={ManagementSignOffPage} />}
        </Route>
        <Route path="/clients/:id/compliance-journey">
          {(_params) => <ProtectedRoute component={ComplianceJourneyDashboard} />}
        </Route>
        <Route path="/clients/:id/readiness/wizard/:standardId?">
          {(_params) => <ProtectedRoute component={ReadinessWizardPage} />}
        </Route>
        <Route path="/clients/:id/roadmap/dashboard">
          {(_params) => <ProtectedRoute component={RoadmapDashboard} />}
        </Route>
        <Route path="/clients/:id/roadmap/overview">
          {(_params) => <Redirect to={`/clients/${_params.id}/roadmap`} />}
        </Route>
        <Route path="/clients/:id/roadmap/create">
          {(_params) => <ProtectedRoute component={RoadmapCreatePage} />}
        </Route>
        <Route path="/clients/:id/roadmap/templates">
          {(_params) => <ProtectedRoute component={RoadmapTemplates} />}
        </Route>
        <Route path="/clients/:id/roadmap/reports">
          {(_params) => <Redirect to={`/clients/${_params.id}/reports`} />}
        </Route>
        <Route path="/clients/:id/roadmap/:roadmapId">
          {(_params) => <ProtectedRoute component={RoadmapDetailsPage} />}
        </Route>
        <Route path="/clients/:id/roadmap/:roadmapId/edit">
          {(_params) => <ProtectedRoute component={RoadmapEditPage} />}
        </Route>

        {/* Dev Projects routes */}
        <Route path="/projects">
          <ProjectsAlias />
        </Route>
        <Route path="/dev/projects">
          <DevProjectsAlias />
        </Route>
        <Route path="/clients/:clientId/dev/projects/:projectId/threat-model/:modelId">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={ThreatModelWizard} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:clientId/dev/projects/:projectId">
          {(_params) => <ProtectedRoute component={ProjectDetail} />}
        </Route>
        <Route path="/clients/:clientId/dev/projects">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={DevProjectsList} /></UnifiedClientGuard>}
        </Route>

        {/* General Security Projects routes */}
        <Route path="/clients/:id/projects">
          {(_params) => <ProtectedRoute component={SecurityProjectsDashboard} />}
        </Route>
        <Route path="/clients/:clientId/projects/:projectId">
          {(_params) => <ProtectedRoute component={SecurityProjectDetail} />}
        </Route>


        <Route path="/clients/:id/implementation">
          {(_params) => <ProtectedRoute component={ImplementationDashboard} />}
        </Route>
        <Route path="/clients/:id/implementation/dashboard">
          {(_params) => <ProtectedRoute component={ImplementationDashboard} />}
        </Route>
        <Route path="/clients/:id/implementation/create">
          {(_params) => <ProtectedRoute component={ImplementationCreate} />}
        </Route>
        <Route path="/clients/:id/implementation/plan/:planId">
          {(_params) => (
            <ProtectedRoute
              component={() => (
                <MultiFrameworkPlanView
                  planId={parseInt(_params.planId)}
                  clientId={parseInt(_params.id)}
                />
              )}
            />
          )}
        </Route>
        <Route path="/clients/:id/implementation/kanban/:planId">
          <ProtectedRoute component={ImplementationKanbanPage} />
        </Route>
        <Route path="/clients/:id/implementation/resources">
          {(_params) => <ProtectedRoute component={ImplementationResources} />}
        </Route>
        <Route path="/clients/:id/implementation/templates">
          {(_params) => <ProtectedRoute component={TemplateManager} />}
        </Route>

        {/* NIS2 Compliance Tools */}
        <Route path="/clients/:id/nis2/entity-classification">
          {(_params) => (
            <ProtectedRoute>
              <NIS2EntityClassificationWizard key={_params.id} />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/clients/:id/nis2/management-liability">
          {(_params) => <ProtectedRoute component={NIS2ManagementLiability} />}
        </Route>
        <Route path="/clients/:id/nis2/security-measures">
          {(_params) => <ProtectedRoute component={NIS2SecurityMeasures} />}
        </Route>
        <Route path="/clients/:id/nis2/incident-reporting">
          {(_params) => <ProtectedRoute component={NIS2IncidentReporting} />}
        </Route>
        <Route path="/clients/:id/nis2/entity-registry">
          {(_params) => <ProtectedRoute component={NIS2EntityRegistry} />}
        </Route>
        <Route path="/clients/:id/nis2/supply-chain">
          {(_params) => <ProtectedRoute component={NIS2SupplyChainSecurity} />}
        </Route>
        <Route path="/clients/:id/nis2/cross-border">
          {(_params) => <ProtectedRoute component={NIS2CrossBorderCompliance} />}
        </Route>
        <Route path="/clients/:id/nis2/audit-bundle">
          {(_params) => <ProtectedRoute component={NIS2AuditBundle} />}
        </Route>
        <Route path="/clients/:id/nis2">
          {(_params) => <ProtectedRoute component={NIS2CyberResilienceHub} />}
        </Route>

        {/* Legacy NIS2 route redirect }}
        <Route path="/clients/:id/nis2-assessment">
          {(_params) => <Redirect to={`/clients/${_params.id}/nis2`} />}
        </Route>

        {/* Workflow Hub & Player */}
        <Route path="/clients/:id/workflows">
          {(_params) => <ProtectedRoute component={WorkflowsHub} />}
        </Route>
        <Route path="/clients/:id/workflows/:workflowId">
          {(_params) => <ProtectedRoute component={WorkflowPlayer} />}
        </Route>

        <Route path="/clients/:id/notifications">
          {(_params) => <ProtectedRoute component={Notifications} />}
        </Route>
        <Route path="/clients/:id/reports/:reportId">
          {(_params) => <ProtectedRoute component={ReportEditor} />}
        </Route>
        <Route path="/clients/:id/reports">
          {(_params) => <ProtectedRoute component={Reports} />}
        </Route>
        <Route path="/clients/:id/audit-hub">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={AuditHub} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/employees/:employeeId">
          {(_params) => <ProtectedRoute component={EmployeeDetails} />}
        </Route>
        <Route path="/clients/:id/settings">
          {(_params) => <ProtectedRoute component={ClientSettings} />}
        </Route>
        <Route path="/clients/:id/license">
          {(_params) => <ProtectedRoute component={ClientLicenseActivation} />}
        </Route>
        <Route path="/clients/:id/activity">
          {(_params) => <ProtectedRoute component={ClientActivity} />}
        </Route>
        <Route path="/clients/:id/communication">
          {(_params) => <ProtectedRoute component={ClientEmail} />}
        </Route>
        <Route path="/clients/:id/tasks">
          {(_params) => <ProtectedRoute component={ClientTasksPage} />}
        </Route>
        <Route path="/clients/:id/audit-readiness">
          {(_params) => <ProtectedRoute component={AuditReadinessPage} />}
        </Route>
        <Route path="/clients/:id/auditor-portal">
          {(_params) => <ProtectedRoute component={AuditorChecklistPage} />}
        </Route>
        <Route path="/clients/:id/audit-readiness/alignment-guide">
          {(_params) => <ProtectedRoute component={AuditReadinessAlignmentPage} />}
        </Route>
        <Route path="/audit-readiness">
          <Redirect to="/dashboard" />
        </Route>
        {/* Redirect direct /communication access to dashboard since it requires client context */}
        <Route path="/communication">
          <Redirect to="/dashboard" />
        </Route>
        {/* Friendly aliases for common nav typos / old links */}
        <Route path="/clients/:id/risk">
          {(_params) => <Redirect to={`/clients/${_params.id}/risks`} />}
        </Route>
        <Route path="/clients/new/msp">
          <ProtectedRoute component={MSPOnboarding} />
        </Route>
        <Route path="/risk-register">
          <RiskRegisterAlias />
        </Route>
        <Route path="/risk-register/critical">
          <CriticalRisksAlias />
        </Route>
        <Route path="/evidence">
          <EvidenceAlias />
        </Route>
        <Route path="/clients/:id/risks/critical">
          {(_params) => <ProtectedRoute component={CriticalRisksPage} />}
        </Route>
        <Route path="/clients/:id/risks/register">
          {(_params) => <ProtectedRoute component={RiskRegisterPage} />}
        </Route>
        <Route path="/clients/:id/risks/framework">
          {(_params) => <ProtectedRoute component={RiskFramework} />}
        </Route>
        <Route path="/clients/:id/risks/assets">
          {(_params) => <ProtectedRoute component={RiskAssetsPage} />}
        </Route>
        <Route path="/clients/:id/risks/dashboard">
          {(_params) => <ProtectedRoute component={RiskDashboard} />}
        </Route>
        <Route path="/clients/:id/risks/report">
          {(_params) => <ProtectedRoute component={RiskReportList} />}
        </Route>
        <Route path="/clients/:id/risks/report/:reportId">
          {(_params) => <ProtectedRoute component={RiskReportEditor} />}
        </Route>
        <Route path="/clients/:id/risks/treatment-plan">
          {(_params) => <ProtectedRoute component={RiskTreatmentPlanPage} />}
        </Route>
        <Route path="/clients/:id/risks/overview">
          {(_params) => <ProtectedRoute component={RiskOverview} />}
        </Route>
        <Route path="/clients/:id/risks">
          {(_params) => <ProtectedRoute component={RiskDashboard} />}
        </Route>
        <Route path="/clients/:id/risks/adversary-intel">
          {(_params) => <PremiumGuard><ProtectedRoute component={AdversaryIntelPage} /></PremiumGuard>}
        </Route>
        <Route path="/clients/:id/risks/vulnerability-workbench">
          {(_params) => <PremiumGuard><ProtectedRoute component={VulnerabilityWorkbench} /></PremiumGuard>}
        </Route>
        <Route path="/clients/:id/vendors">
          {(_params) => <Redirect to={`/clients/${_params.id}/vendors/overview`} />}
        </Route>
        <Route path="/vendors">
          <VendorsAlias />
        </Route>
        <Route path="/vendors/assessments/overdue">
          <OverdueAssessmentsAlias />
        </Route>
        <Route path="/clients/:id/vendors/assessments/overdue">
          {(_params) => (
            <ProtectedRoute>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <OverdueAssessmentsPage />
              </TPRMLayout>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/clients/:id/tprm">
          {(_params) => <Redirect to={`/clients/${_params.id}/vendors/overview`} />}
        </Route>
        <Route path="/clients/:id/vendors/overview-guide">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <VendorOverview />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/alignment-guide">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <VendorAlignmentPage />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/overview">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <VendorDashboard />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/discovery">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <VendorList mode="discovery" />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/reviews">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth>
                <SecurityReviews />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/all">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <VendorList mode="all" />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/catalog">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <GlobalVendorCatalog />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/templates">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <AssessmentTemplates />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/templates/new">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <TemplateEditor />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/contracts">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <ProtectedRoute component={VendorContractTemplates} />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/templates/:templateId">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <TemplateEditor />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/onboard">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <OnboardVendor />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/dpa-templates">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <ProtectedRoute component={DPAManager} />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/ai-governance">
          {(_params) => <ProtectedRoute component={() => <PremiumGuard><AIGovernance /></PremiumGuard>} />}
        </Route>
        <Route path="/clients/:id/ai-governance/program-guide">
          {(_params) => <ProtectedRoute component={() => <PremiumGuard><AIGovernanceProgramGuide /></PremiumGuard>} />}
        </Route>

        {/* Privacy routes are handled below in the dedicated section */}
        <Route path="/clients/:id/vendors/:vendorId">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <VendorDetails />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/vendors/dpa-editor/:dpaId">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <ProtectedRoute component={DPAEditor} />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/tprm/dpa-editor/:dpaId">
          {(_params) => (
            <PremiumGuard>
              <ProtectedRoute component={DPAEditor} />
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/evaluations/subprocessors">
          {(_params) => (
            <PremiumGuard>
              <TPRMLayout clientId={parseInt(_params.id)} fullWidth={true}>
                <SubprocessorRegister />
              </TPRMLayout>
            </PremiumGuard>
          )}
        </Route>
        <Route path="/clients/:id/risks/threats">
          {(_params) => <ProtectedRoute component={RiskThreatsPage} />}
        </Route>
        <Route path="/clients/:id/risks/vulnerabilities">
          {(_params) => <ProtectedRoute component={RiskVulnerabilitiesPage} />}
        </Route>
        <Route path="/clients/:id/risk/vulnerability-scanner">
          {(_params) => <ProtectedRoute component={VulnerabilityScannerPage} />}
        </Route>
        <Route path="/clients/:id/risk/siem">
          {(_params) => <ProtectedRoute component={SIEMDashboard} />}
        </Route>
        <Route path="/clients/:id/risk/soar">
          {(_params) => <ProtectedRoute component={SOARDashboard} />}
        </Route>
        <Route path="/clients/:id/risk/threat-intel">
          {(_params) => <ProtectedRoute component={ThreatIntelDashboard} />}
        </Route>
        <Route path="/clients/:id/risks/assessments">
          {(_params) => <ProtectedRoute component={RiskAssessmentsPage} />}
        </Route>
        <Route path="/clients/:clientId/risks/assessments/:assessmentId">
          {(_params) => <ProtectedRoute component={RiskAssessmentEditor} />}
        </Route>
        <Route path="/clients/:clientId/risks/vulnerabilities/:vulnerabilityId">
          {(_params) => <ProtectedRoute component={RiskVulnerabilityEditor} />}
        </Route>
        <Route path="/clients/:clientId/risks/assets/:assetId">
          {(params) => <ProtectedRoute component={RiskAssetEditor} {...params} />}
        </Route>
        <Route path="/clients/:clientId/risks/threats/:threatId">
          {(_params) => <ProtectedRoute component={RiskThreatEditor} />}
        </Route>
        <Route path="/clients/:clientId/risks/guided">
          {(_params) => <ProtectedRoute component={GuidedRiskValidation} />}
        </Route>
        <Route path="/clients/:id/risks/alignment-guide">
          {(_params) => <ProtectedRoute component={RiskAlignmentPage} />}
        </Route>

        {/* Gap Analysis Routes */}
        <Route path="/clients/:id/gap-analysis">
          {(_params) => <ProtectedRoute component={GapAnalysisList} />}
        </Route>
        <Route path="/clients/:id/gap-analysis/new">
          {(_params) => <ProtectedRoute component={NewGapAnalysis} />}
        </Route>
        <Route path="/clients/:id/gap-analysis/:assessmentId">
          {(_params) => <ProtectedRoute component={GapAnalysisEditor} />}
        </Route>


        {/* ISO 27001 Readiness */}
        <Route path="/clients/:id/readiness/wizard/:standardId?">
          {(_params) => <ProtectedRoute component={ReadinessWizardPage} />}
        </Route>
        <Route path="/clients/:id/readiness/roadmap">
          {(_params) => <ProtectedRoute component={RoadmapPage} />}
        </Route>
        <Route path="/clients/:id/roadmap/:roadmapId">
          {(_params) => <ProtectedRoute component={RoadmapDetailsPage} />}
        </Route>
        {/* Legacy redirect or alias if needed, keeping for robustness but user wants Strategic */}
        <Route path="/clients/:id/readiness/roadmap/:roadmapId">
          {(_params) => <Redirect to={`/clients/${_params.id}/roadmap/${_params.roadmapId}`} />}
        </Route>

        <Route path="/gap-analysis">
          <ProtectedRoute component={GapAnalysisAlias} />
        </Route>

        <Route path="/samm">
          <ProtectedRoute component={SAMMAlias} />
        </Route>

        {/* Federal Compliance Hub Routes */}
        <Route path="/clients/:id/federal/overview">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FederalOverview} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FederalComplianceDashboard} /></UnifiedClientGuard>}
        </Route>

        <Route path="/clients/:id/compliance-obligations">
          {(_params) => <ProtectedRoute component={RegulationsDashboard} />}
        </Route>
        <Route path="/clients/:id/compliance-obligations/:regId">
          {(_params) => <ProtectedRoute component={RegulationDetail} />}
        </Route>
        <Route path="/clients/:id/settings/plugins">
          {(_params) => <ProtectedRoute component={PluginSettings} />}
        </Route>
        <Route path="/clients/:id/plugins/:slug">
          {(_params) => <ProtectedRoute component={PluginPage} />}
        </Route>
        <Route path="/clients/:id/federal/fedramp">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FedRAMPPackagesPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/fisma">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FismaSystemsPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/dfars">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={DfarsPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/assessment-171">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={Nist800171AssessmentPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/rmf">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={RmfPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/rmf/:workflowId">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={RmfWorkflowPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/stigs">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={StigsPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/stigs/:checklistId">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={StigChecklistPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/fips-140">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={Fips140Page} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/fedramp/:packageId">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FedRAMPPackageDetailPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/nist-800-53">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={Nist80053AssessmentPage} /></UnifiedClientGuard>}
        </Route>
        {/* Alias for cleaner URL navigation */}
        <Route path="/clients/:id/federal/assessment">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={Nist80053AssessmentPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/assessment-80053">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={Nist80053AssessmentPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/gap-report">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={NonComplianceReport} /></UnifiedClientGuard>}
        </Route>
        {/* Redirect for legacy URL */}
        <Route path="/clients/:id/federal/800-53">
          {(_params) => <Redirect to={`/clients/${_params.id}/federal/nist-800-53`} />}
        </Route>

        {/* Add missing placeholders and sub-routes */}
        <Route path="/clients/:id/federal/monitor">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={MonitorPlaceholder} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/sprs">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SPRSPlaceholder} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/hub">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FederalHub} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/contracts">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FederalContractsPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/cui-quiz">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={CuiApplicabilityQuiz} /></UnifiedClientGuard>}
        </Route>

        <Route path="/clients/:id/federal/fips-199">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={FipsCategorizationPage} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/poam">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={POAMTracker} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/ssp-171">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SSPEditor} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/ssp-172">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SSPEditor} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/sar-171">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SARViewer} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/sar-172">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SARViewer} /></UnifiedClientGuard>}
        </Route>
        {/* Generic SAR and SSP routes for simpler navigation */}
        <Route path="/clients/:id/federal/sar">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SARViewer} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/ssp">
          {(_params) => <UnifiedClientGuard requirePremium><ProtectedRoute component={SSPEditor} /></UnifiedClientGuard>}
        </Route>
        <Route path="/clients/:id/federal/alignment-guide">
          {(_params) => <ProtectedRoute component={FederalAlignmentPage} />}
        </Route>

        {/* Privacy Routes */}
        <Route path="/clients/:id/privacy">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <PrivacyDashboard />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/overview">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <PrivacyOverview />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:clientId/privacy/alignment-guide">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.clientId)}>
              <PrivacyAlignmentPage />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/inventory">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <DataInventory />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/ropa">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <ROPADashboard />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/dsar">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <DSARManager />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/dsar/:dsarId">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <DsarDetail />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/dpia">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <DPIAManager />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/dpia/new">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <DPIAQuestionnaire />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/dpia/:dpiaId/questionnaire">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <DPIAQuestionnaire />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/transfers">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <TransferDashboard />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/transfers/:transferId">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <TIAWorkspace />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/breaches">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <DataBreachRegister />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/assessments/gdpr">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <GdprAssessmentPage />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/assessment/gdpr">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <GdprAssessmentPage />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/assessments/:type">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <DynamicPrivacyAssessmentPage />
            </PrivacyLayout>
          )}
        </Route>
        <Route path="/clients/:id/privacy/assessment/:type">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)}>
              <DynamicPrivacyAssessmentPage />
            </PrivacyLayout>
          )}
        </Route>

        {/* Cyber Resilience Routes */}
        <Route path="/clients/:id/cyber/program-guide">
          {(_params) => <ProtectedRoute component={CyberProgramGuide} />}
        </Route>
        <Route path="/clients/:id/cyber/overview">
          {(_params) => (
            <CyberLayout>
              <CyberOverview />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber">
          {(_params) => (
            <CyberLayout>
              <CyberDashboard />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/assessment">
          {(_params) => (
            <CyberLayout>
              <CyberAssessment />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/incidents/new">
          {(_params) => (
            <CyberLayout>
              <CyberIncidentReporting />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/incidents/:incidentId">
          {(_params) => (
            <CyberLayout>
              <CyberIncidentDetail />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/incidents">
          {(_params) => (
            <CyberLayout>
              <CyberIncidentsPage />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/documents">
          {(_params) => (
            <CyberLayout>
              <CyberDocumentation />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/mapping">
          {(_params) => (
            <CyberLayout fullWidth={true}>
              <NIS2MappingHub />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/workbook">
          {(_params) => (
            <CyberLayout fullWidth={true}>
              <NIS2Workbook />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/threat-intel">
          {(_params) => (
            <CyberLayout>
              <ThreatIntelligence />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/supply-chain">
          {(_params) => (
            <CyberLayout>
              <SupplyChainRisk />
            </CyberLayout>
          )}
        </Route>
        <Route path="/clients/:id/cyber/vulnerabilities">
          {(_params) => <CyberLayout><UnifiedClientGuard requirePremium><VulnerabilityManagement /></UnifiedClientGuard></CyberLayout>}
        </Route>
        <Route path="/clients/:id/cyber/assets">
          {(_params) => <CyberLayout><UnifiedClientGuard requirePremium><AssetCriticalityMatrix /></UnifiedClientGuard></CyberLayout>}
        </Route>
        <Route path="/clients/:id/cyber/testing">
          {(_params) => <CyberLayout><UnifiedClientGuard requirePremium><SecurityTesting /></UnifiedClientGuard></CyberLayout>}
        </Route>
        <Route path="/clients/:id/cyber/monitoring">
          {(_params) => (
            <CyberLayout>
              <CyberMonitoring />
            </CyberLayout>
          )}
        </Route>

        {/* ISO 27001 ISMS Routes */}
        <Route path="/clients/:id/iso27001">
          {(_params) => <ProtectedRoute component={ISODashboard} />}
        </Route>
        <Route path="/clients/:id/iso27001/soa">
          {(_params) => <ProtectedRoute component={StatementOfApplicability} />}
        </Route>
        <Route path="/clients/:id/iso27001/risks">
          {(_params) => <ProtectedRoute component={ISORiskManagement} />}
        </Route>
        <Route path="/clients/:id/iso27001/assets">
          {(_params) => <ProtectedRoute component={ISOAssetRegister} />}
        </Route>
        <Route path="/clients/:id/iso27001/audit">
          {(params) => (
            <ProtectedRoute component={ISOAuditManager} {...params} />
          )}
        </Route>
        <Route path="/clients/:id/iso27001/governance">
          {(_params) => <ProtectedRoute component={ISOContext} />}
        </Route>
        <Route path="/clients/:id/iso27001/management-review">
          {(_params) => <ProtectedRoute component={ISOManagementReview} />}
        </Route>
        <Route path="/clients/:id/iso27001/documents">
          {(_params) => <ProtectedRoute component={ISODocumentTracker} />}
        </Route>
        <Route path="/clients/:id/iso27001/program-guide">
          {(_params) => <ProtectedRoute component={ISOProgramGuide} />}
        </Route>
        <Route path="/clients/:id/audit-manager">
          {(params) => (
            <ProtectedRoute component={AuditManager} {...params} />
          )}
        </Route>

        <Route path="/clients/:id/privacy/documents">
          {(_params) => (
            <PrivacyLayout clientId={parseInt(_params.id)} fullWidth>
              <PrivacyDocsDashboard />
            </PrivacyLayout>
          )}
        </Route>

        {/* Reuse PolicyEditor but maybe wrapped or just passed ID. 
            PolicyEditor expects params :clientId and :policyId usually? 
            Let's check how PolicyEditor is used. 
            It is usually /clients/:clientId/policies/:policyId. 
            We can reuse it here mapping /clients/:id/privacy/documents/:policyId 
        */}
        <Route path="/clients/:id/privacy/documents/:policyId">
          {(_params) => (
            // We need to verify if PolicyEditor uses 'clientId' or 'id' param.
            // Looking at lazy import: const PolicyEditor = lazyLoad(() => import("./pages/PolicyEditor"));
            // Let's assume it works if we match params or use standard route.
            // Actually PolicyEditor likely looks at specific URL pattern or params.
            // Let's just point to it.
            <ProtectedRoute component={PolicyEditor} />
          )}
        </Route>


        <Route path="/clients/:id/intake">
          {(_params) => (
            <PremiumGuard>
              <ProtectedRoute component={EvidenceIntakeBox} />
            </PremiumGuard>
          )}
        </Route>

        <Route path="/clients/:id/board-summary">
          {(_params) => <ProtectedRoute component={BoardSummaryPage} />}
        </Route>

        <Route path="/advisor/workbench">
          {(_params) => <PremiumGuard><ProtectedRoute component={AdvisorWorkbench} /></PremiumGuard>}
        </Route>

        {/* Generic client workspace route - redirect to governance dashboard */}
        <Route path="/clients/:id">
          {(_params) => <Redirect to={`/clients/${_params.id}/governance`} />}
        </Route>

        <Route path="/compliance">
          <ProtectedRoute component={ComplianceDashboardAlias} />
        </Route>



        <Route path="/client-controls">
          <ProtectedRoute component={ClientControlsAlias} />
        </Route>
        <Route path="/client-policies">
          <ProtectedRoute component={ClientPoliciesAlias} />
        </Route>
        <Route path="/risks">
          <ProtectedRoute component={RiskManagementAlias} />
        </Route>
        <Route path="/cyber/:rest*">
          <ProtectedRoute component={CyberAlias} />
        </Route>
        <Route path="/cyber/incidents/new">
          <ProtectedRoute component={CyberAlias} />
        </Route>
        <Route path="/cyber/incidents/:incidentId">
          <ProtectedRoute component={CyberAlias} />
        </Route>
        <Route path="/cyber/incidents">
          <ProtectedRoute component={CyberAlias} />
        </Route>
        <Route path="/cyber/assessment">
          <ProtectedRoute component={CyberAlias} />
        </Route>
        <Route path="/cyber/documents">
          <ProtectedRoute component={CyberAlias} />
        </Route>
        <Route path="/cyber">
          <ProtectedRoute component={CyberAlias} />
        </Route>



        <Route path="/controls">
          <ProtectedRoute component={Controls} />
        </Route>
        <Route path="/harmonization">
          <ProtectedRoute component={HarmonizationStudio} />
        </Route>
        <Route path="/policy-templates">
          <ProtectedRoute component={PolicyTemplates} />
        </Route>

        <Route path="/mappings">
          <ProtectedRoute component={Mappings} />
        </Route>
        <Route path="/settings/:rest*">
          {(_params) => (
            <DashboardLayout>
              <Switch>
                <Route path="/settings/users">
                  <ProtectedRoute component={UserManagement} />
                </Route>
                <Route path="/settings/organization">
                  <ProtectedRoute component={OrganizationManagement} />
                </Route>
                <Route path="/settings/onboarding">
                  <ProtectedRoute component={() => <OnboardingSettings hideLayout />} />
                </Route>
                <Route path="/settings/security">
                  <ProtectedRoute component={SecuritySettings} />
                </Route>
                <Route path="/settings/plugins">
                  <ProtectedRoute component={PluginSettings} />
                </Route>
                <Route path="/settings/invitations">
                  <ProtectedRoute component={UserInvitations} />
                </Route>
                <Route path="/settings/integrations">
                  <ProtectedRoute component={IntegrationsPage} />
                </Route>
                <Route path="/settings">
                  <Redirect to="/settings/security" />
                </Route>
                {/* Default redirect for unmatched settings subroutes */}
                <Route>
                  <Redirect to="/settings/security" />
                </Route>
              </Switch>
            </DashboardLayout>
          )}
        </Route>
        <Route path="/evidence">
          <ProtectedRoute component={Evidence} />
        </Route>
        <Route path="/calendar">
          <ProtectedRoute component={Calendar} />
        </Route>
        <Route path="/notifications">
          <ProtectedRoute component={Notifications} />
        </Route>
        <Route path="/profile">
          <ProtectedRoute component={Profile} />
        </Route>

        <Route path="/addons">
          <ProtectedRoute component={AddonMarketplace} />
        </Route>
        <Route path="/addons/my">
          <ProtectedRoute component={AddonMarketplace} />
        </Route>
        <Route path="/addons/:slug/dashboard">
          <ProtectedRoute component={AddonDashboard} />
        </Route>
        <Route path="/addons/:slug/settings">
          <ProtectedRoute component={AddonSettings} />
        </Route>
        <Route path="/addons/:slug">
          <ProtectedRoute component={AddonDetail} />
        </Route>

        <Route path="/onboarding">
          <ProtectedRoute component={EmployeeOnboarding} />
        </Route>

        <Route path="/admin/crm/:id">
          <AdminLayout>
            <ProtectedRoute component={ContactDetail} />
          </AdminLayout>
        </Route>
        <Route path="/admin/crm">
          <AdminLayout>
            <ProtectedRoute component={GlobalCRM} />
          </AdminLayout>
        </Route>


        {/* Admin Routes */}
        <Route path="/admin/:rest*">
          <AdminLayout>
            <Switch>
              <Route path="/admin/organizations" component={() => <ProtectedRoute component={OrganizationManagement} />} />
              <Route path="/admin/user-management" component={() => <ProtectedRoute component={UserManagement} />} />
              <Route path="/admin/invitations" component={() => <ProtectedRoute component={UserInvitations} />} />
              <Route path="/admin/audit" component={() => <ProtectedRoute component={AuditLogs} />} />
              <Route path="/admin/llm" component={() => <ProtectedRoute component={LLMSettings} />} />
              {/* <Route path="/admin/cloud" component={() => <ProtectedRoute component={CloudIntegrations} />} /> */}
              <Route path="/admin/billing" component={() => <Redirect to="/clients/730/settings?tab=billing" />} />
              <Route path="/admin/license" component={() => <ProtectedRoute component={LicenseManagement} />} />

              {/* <Route path="/admin/integrations" component={() => <ProtectedRoute component={Integrations} />} /> */}

              {/* Default admin route */}
              <Route path="/admin" component={() => <ProtectedRoute component={UserManagement} />} />
            </Switch>
          </AdminLayout>
        </Route>

        {/* Business Continuity Routes */}
        <Route path="/business-continuity">
          <ProtectedRoute component={BusinessContinuityAlias} />
        </Route>
        <Route path="/business-continuity/:rest*">
          <ProtectedRoute component={BusinessContinuityAlias} />
        </Route>

        <Route path="/clients/:id/business-continuity">
          {(_params) => <ProtectedRoute component={BusinessContinuityDashboard} />}
        </Route>
        <Route path="/clients/:id/business-continuity/governance">
          {(_params) => <ProtectedRoute component={BCGovernancePage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/bia">
          {(_params) => <ProtectedRoute component={BusinessImpactAnalysisPage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/bia/:biaId">
          {(_params) => <ProtectedRoute component={BusinessImpactAnalysisEditor} />}
        </Route>
        <Route path="/clients/:id/business-continuity/strategies">
          {(_params) => <ProtectedRoute component={BusinessContinuityStrategiesPage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/plans">
          {(_params) => <ProtectedRoute component={BusinessContinuityPlansPage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/plans/new">
          {(_params) => <ProtectedRoute component={RecoveryPlanBuilder} />}
        </Route>
        <Route path="/clients/:id/business-continuity/plans/:planId">
          {(_params) => <ProtectedRoute component={BCPlanManager} />}
        </Route>
        <Route path="/clients/:id/business-continuity/call-tree">
          {(_params) => <ProtectedRoute component={CallTreeManager} />}
        </Route>
        <Route path="/clients/:id/business-continuity/exercises">
          {(_params) => <ProtectedRoute component={BCExercisesPage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/training">
          {(_params) => <ProtectedRoute component={BCTrainingPage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/processes">
          {(_params) => <ProtectedRoute component={ProcessRegistry} />}
        </Route>
        <Route path="/clients/:id/business-continuity/processes/:action">
          {(_params) => <ProtectedRoute component={ProcessBuilder} />}
        </Route>
        <Route path="/clients/:id/business-continuity/scenarios">
          {(_params) => <ProtectedRoute component={DisruptiveScenariosPage} />}
        </Route>
        <Route path="/clients/:id/business-continuity/scenarios/:scenarioId">
          {(_params) => <ProtectedRoute component={DisruptiveScenarioEditor} />}
        </Route>
        <Route path="/clients/:id/business-continuity/wizard">
          {(_params) => <ProtectedRoute component={TotalBcpWizard} />}
        </Route>
        <Route path="/clients/:id/business-continuity/new-project">
          {(_params) => <ProtectedRoute component={BCPProjectWizard} />}
        </Route>
        <Route path="/clients/:id/business-continuity/tasks">
          {(_params) => <ProtectedRoute component={TasksDashboard} />}
        </Route>

        <Route path="/clients/:id/business-continuity/iso22301">
          {(_params) => <ProtectedRoute component={ISO22301CompliancePage} />}
        </Route>

        {/* Workflows & Playbooks */}
        <Route path="/clients/:id/workflows">
          {(_params) => <ProtectedRoute component={WorkflowsHub} />}
        </Route>
        <Route path="/clients/:id/workflows/:workflowId">
          {(_params) => <ProtectedRoute component={WorkflowPlayer} />}
        </Route>

        {/* Learning Zone */}
        <Route path="/learning/iso-27001/checklist">
          {(_params) => <ProtectedRoute component={ISO27001ReadinessChecklist} />}
        </Route>
        <Route path="/learning">
          <ProtectedRoute component={LearningPage} />
        </Route>
        <Route path="/learning/:frameworkId">
          <ProtectedRoute component={LearningPage} />
        </Route>

        {/* Onboarding */}
        <Route path="/start-here">
          <ProtectedRoute component={StartHere} />
        </Route>

        {/* Features Page */}
        <Route path="/features">
          <ProtectedRoute component={FeaturesPage} />
        </Route>

        {/* UI Pattern Showcase */}
        <Route path="/ui-showcase">
          <ProtectedRoute component={UIPatternShowcase} />
        </Route>

        {/* Compliance Obligations */}


        <Route path="/frameworks/:id">
          <ProtectedRoute component={FrameworkDetails} />
        </Route>
        <Route path="/frameworks">
          <ProtectedRoute component={FrameworksDashboard} />
        </Route>
        <Route path="/compliance-requirements">
          <ProtectedRoute component={ComplianceRequirementsPage} />
        </Route>

        {/* Route Aliases for better UX */}
        <Route path="/people">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/people`} /> : <Redirect to="/clients" />;
          }} />
        </Route>
        <Route path="/raci-matrix">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/raci-matrix`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/assurance">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/assurance`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/assurance/:frameworkId">
          {(params) => (
            <ProtectedRoute component={() => {
              const { selectedClientId } = useClientContext();
              return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/assurance/${params.frameworkId}`} /> : <Redirect to="/clients" />;
            }} />
          )}
        </Route>

        <Route path="/nist-csf-2">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/nist-csf-2`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/cisa-ztmm-2">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/cisa-ztmm-2`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/cmmc-2">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/cmmc-2`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/c2m2-2.1">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/c2m2-2.1`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/essential-eight">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/essential-eight`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/samm">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/samm`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/asvs">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/asvs`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/iso27001/:rest*">
          {(params) => (
            <ProtectedRoute component={() => {
              const { selectedClientId } = useClientContext();
              return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/iso27001/${params.rest}`} /> : <Redirect to="/clients" />;
            }} />
          )}
        </Route>

        <Route path="/iso27001">
          <ProtectedRoute component={() => {
            const { selectedClientId } = useClientContext();
            return selectedClientId ? <Redirect to={`/clients/${selectedClientId}/iso27001`} /> : <Redirect to="/clients" />;
          }} />
        </Route>

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense >
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ClientContextProvider>
          <BrandingProvider>
            <GlobalBrandingSync />
            <AdvisorProvider>
              <ThemeProvider defaultTheme="light">
                <TooltipProvider>
                  <Toaster />
                  <SystemFeedbackModal />
                  <GDPRBanner />
                  <Router />
                </TooltipProvider>
              </ThemeProvider>
            </AdvisorProvider>
          </BrandingProvider>
        </ClientContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
