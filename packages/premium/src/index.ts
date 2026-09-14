export * from "./lib/advisor/service";
export * from "./lib/advisor/types";
export * from "./components/advisor/AIEnhanceButton";
export * from "./components/advisor/CopilotButton";
export * from "./components/advisor/CopilotHelpTrigger";
export * from "./components/advisor/CopilotPanel";
export * from "./components/advisor/ImplementationPlanViewer";
export * from "./components/advisor/MappingExplainer";
export * from "./components/advisor/QuickAsk";
export * from "./components/advisor/TechSuggestionPanel";
export * from "./components/advisor/VendorMitigationPlanViewer";
export * from "./components/frameworks/CustomFrameworkImportDialog";

import { CopilotButton } from "./components/advisor/CopilotButton";
import { CopilotPanel } from "./components/advisor/CopilotPanel";
import { CopilotHelpTrigger } from "./components/advisor/CopilotHelpTrigger";
import { CustomFrameworkImportDialog } from "./components/frameworks/CustomFrameworkImportDialog";
import VendorMitigationPlanViewer from "./components/advisor/VendorMitigationPlanViewer";
import { AIEnhanceButton } from "./components/advisor/AIEnhanceButton";

/**
 * Bootstrap function to register all premium plugins into core ExtensionRegistry
 */
export function registerPremiumExtensions(registerFn: (name: string, component: any) => void) {
    registerFn('global.copilot', CopilotButton);
    registerFn('global.copilot-panel', CopilotPanel);
    registerFn('topbar.copilot-help', CopilotHelpTrigger);
    registerFn('frameworks.custom-import', CustomFrameworkImportDialog);
    registerFn('tprm.mitigation-viewer', VendorMitigationPlanViewer);
    registerFn('ai.enhance-button', AIEnhanceButton);
}
