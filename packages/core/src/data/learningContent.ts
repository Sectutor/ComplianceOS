import { Shield, Lock, FileText, Database, Activity, Eye, FileCheck, Globe, Server, UserCheck, ListChecks as List } from "lucide-react";

export interface LearningSection {
  id: string;
  title: string;
  icon?: any;
  content: string; // HTML string for rich formatting
}

export interface FrameworkLearning {
  id: string;
  title: string;
  description: string;
  color: string;
  sections: LearningSection[];
}

export const learningContent: Record<string, FrameworkLearning> = {
  "iso-27001": {
    id: "iso-27001",
    title: "ISO 27001:2022",
    description: "The international standard for Information Security Management Systems (ISMS).",
    color: "bg-blue-600",
    sections: [
      {
        id: "intro",
        title: "The Gold Standard for ISMS",
        icon: Shield,
        content: `
          <div class="space-y-6">
            <div class="p-8 border border-slate-200" style="background: #ffffff !important; border-radius: 20px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important; border-left: 6px solid #2563eb !important;">
              <h4 class="text-2xl font-black text-slate-900 mb-4 tracking-tight">Information Security Management</h4>
              <p class="text-lg leading-relaxed text-slate-600 font-medium">
                ISO/IEC 27001 is the world's premier standard for establishing, implementing, and improving an <strong>Information Security Management System (ISMS)</strong>. It provides a risk-based framework for protecting intellectual property, financial data, and customer information.
              </p>
              <div class="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                <div class="flex-1 p-5 rounded-xl bg-slate-50 border border-slate-100">
                  <h5 class="font-bold text-blue-700 text-sm uppercase tracking-wider mb-2">Primary Goal</h5>
                  <p class="text-sm text-slate-600 leading-relaxed font-semibold">To protect the confidentiality, integrity, and availability (CIA) of information.</p>
                </div>
                <div class="flex-1 p-5 rounded-xl bg-slate-50 border border-slate-100">
                  <h5 class="font-bold text-blue-700 text-sm uppercase tracking-wider mb-2">Scope</h5>
                  <p class="text-sm text-slate-600 leading-relaxed font-semibold">Applies to all organizations regardless of size, type, or nature.</p>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "cia-triad",
        title: "The Heart of Security: CIA Triad",
        icon: Lock,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">ISO 27001 focuses on preserving three key pillars of information:</p>
            <div class="grid gap-4">
              <div class="flex items-center gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-blue-300 group">
                <div class="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-black text-blue-600 group-hover:scale-110 transition-transform shadow-inner">C</div>
                <div class="flex-1">
                  <h4 class="font-black text-xl text-slate-900 tracking-tight">Confidentiality</h4>
                  <p class="text-slate-500 font-medium text-sm mt-1">Ensuring that information is accessible only to those authorized to have access.</p>
                </div>
              </div>
              <div class="flex items-center gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-300 group">
                <div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-600 group-hover:scale-110 transition-transform shadow-inner">I</div>
                <div class="flex-1">
                  <h4 class="font-black text-xl text-slate-900 tracking-tight">Integrity</h4>
                  <p class="text-slate-500 font-medium text-sm mt-1">Safeguarding the accuracy and completeness of information and processing methods.</p>
                </div>
              </div>
              <div class="flex items-center gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-emerald-300 group">
                <div class="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl font-black text-emerald-600 group-hover:scale-110 transition-transform shadow-inner">A</div>
                <div class="flex-1">
                  <h4 class="font-black text-xl text-slate-900 tracking-tight">Availability</h4>
                  <p class="text-slate-500 font-medium text-sm mt-1">Ensuring that authorized users have access to information and associated assets when required.</p>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "risk-assessment",
        title: "Risk Assessment & Mitigation",
        icon: Shield,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">The standard mandates a formal risk management process to determine which security controls are necessary.</p>
            <div class="grid md:grid-cols-3 gap-6">
              <div class="p-6 border border-slate-200 bg-white rounded-3xl shadow-sm text-center group hover:border-blue-400 transition-all">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black mb-4 mx-auto group-hover:bg-blue-600 group-hover:text-white transition-colors">1</div>
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">Identify</h5>
                <p class="text-xs text-slate-500 font-medium leading-relaxed">Identify assets, threats, and vulnerabilities that impact your security.</p>
              </div>
              <div class="p-6 border border-slate-200 bg-white rounded-3xl shadow-sm text-center group hover:border-blue-400 transition-all">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black mb-4 mx-auto group-hover:bg-blue-600 group-hover:text-white transition-colors">2</div>
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">Evaluate</h5>
                <p class="text-xs text-slate-500 font-medium leading-relaxed">Assess the likelihood and impact of each risk to prioritize effort.</p>
              </div>
              <div class="p-6 border border-slate-200 bg-white rounded-3xl shadow-sm text-center group hover:border-blue-400 transition-all">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black mb-4 mx-auto group-hover:bg-blue-600 group-hover:text-white transition-colors">3</div>
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">Treat</h5>
                <p class="text-xs text-slate-500 font-medium leading-relaxed">Decide whether to mitigate, transfer, avoid, or accept the risk.</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "annex-a",
        title: "Annex A: The Security Controls",
        icon: Server,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">The 2022 version of ISO 27001 organizes its 93 controls into 4 logical themes, replacing the previous 14 domains.</p>
            <div class="grid md:grid-cols-2 gap-4">
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">Organizational (37)</h5>
                <p class="text-sm text-slate-500 font-medium">Controls relating to the organization, policies, and management systems.</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">People (8)</h5>
                <p class="text-sm text-slate-500 font-medium">Controls relating to the security of employees, contracts, and training.</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-500">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">Physical (14)</h5>
                <p class="text-sm text-slate-500 font-medium">Security of premises, facilities, and physical assets.</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">Technological (34)</h5>
                <p class="text-sm text-slate-500 font-medium">Technical security controls like encryption, access control, and network security.</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "path-to-certification",
        title: "Path to Certification",
        icon: Activity,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">The journey to ISO 27001 certification involves a two-stage external audit process by an accredited Certification Body (CB).</p>
            <div class="relative space-y-8 mt-10 ml-6">
              <div class="absolute left-0 top-2 bottom-2 w-1 bg-slate-100 rounded-full" />
              
              <div class="relative pl-10 group">
                <div class="absolute -left-3 top-0 w-7 h-7 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-black text-xs text-slate-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-all">1</div>
                <h4 class="font-black text-slate-900 tracking-tight leading-none mb-2">Stage 1: Documentation Audit</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">The auditor reviews your ISMS documentation, including the scope statement, Statement of Applicability (SoA), and risk assessment, to ensure you are ready for Stage 2.</p>
              </div>

              <div class="relative pl-10 group">
                <div class="absolute -left-3 top-0 w-7 h-7 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-black text-xs text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all">2</div>
                <h4 class="font-black text-slate-900 tracking-tight leading-none mb-2">Stage 2: Operational Effectiveness</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">The main certification audit. The auditor examines evidence to confirm that your organization is actually operating the controls defined in your documentation.</p>
              </div>

              <div class="relative pl-10 group">
                <div class="absolute -left-3 top-0 w-7 h-7 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center font-black text-xs text-emerald-500 animate-pulse">3</div>
                <h4 class="font-black text-emerald-600 tracking-tight leading-none mb-2">Certification & Maintenance</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Upon success, you are issued an ISO 27001 certificate valid for 3 years, subject to annual surveillance audits and a full recertification every cycle.</p>
              </div>
            </div>
          </div>
        `
      }
    ]
  },
  "soc-2": {
    id: "soc-2",
    title: "SOC 2 Type II",
    description: "Service Organization Control 2 - The gold standard for SaaS security and trust.",
    color: "bg-orange-600",
    sections: [
      {
        id: "intro",
        title: "The Gold Standard for SaaS",
        icon: FileText,
        content: `
          <div class="space-y-6">
            <div class="p-8 border border-slate-200" style="background: #ffffff !important; border-radius: 20px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important; border-left: 6px solid #f97316 !important;">
              <h4 class="text-2xl font-black text-slate-900 mb-4 tracking-tight">The Attestation Model</h4>
              <p class="text-lg leading-relaxed text-slate-600 font-medium">
                SOC 2 (System and Organization Controls) is a reporting framework developed by the AICPA. Unlike a certification, it is an <strong>attestation report</strong> where an independent CPA firm evaluates your controls against the Trust Services Criteria (TSC).
              </p>
              <div class="mt-6">
                <span style="background: #fff7ed !important; color: #9a3412 !important; padding: 6px 14px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border: 1px solid #ffedd5 !important; display: inline-block;">Auditor Opinion</span>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "tsc",
        title: "The 5 Trust Services Criteria",
        icon: Database,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">Organizations select which criteria to include in their audit. <strong>Security</strong> is the only mandatory baseline.</p>
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight group-hover:text-orange-600 transition-colors">1. Security (Mandatory)</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Protection against unauthorized access, use, or damage to systems and information.</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight group-hover:text-orange-600 transition-colors">2. Availability</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Ensuring information and systems are available for operation and use as committed.</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight group-hover:text-orange-600 transition-colors">3. Confidentiality</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Protecting information designated as confidential until it is no longer required.</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight group-hover:text-orange-600 transition-colors">4. Processing Integrity</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Ensuring system processing is complete, valid, accurate, timely, and authorized.</p>
              </div>
              <div class="p-6 bg-[#fffcf9] border border-orange-200 rounded-2xl shadow-sm group col-span-full border-dashed">
                <h5 class="font-black text-orange-900 mb-2 tracking-tight">5. Privacy</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">How you handle the collection, use, retention, and disposal of personal information.</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "types",
        title: "Type I vs Type II Reports",
        icon: FileCheck,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">Reports are classified based on the testing period and level of evidence provided to stakeholders.</p>
            <div class="grid md:grid-cols-2 gap-6 mt-4">
              <div class="p-8 border border-slate-200 bg-white rounded-3xl shadow-sm border-l-4 border-l-slate-400">
                <h4 class="font-black text-2xl text-slate-900 tracking-tight mb-4">Type I</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  A <strong>point-in-time</strong> assessment. It evaluates whether your controls are designed correctly on a specific date.
                </p>
                <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg w-fit text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Design Verification
                </div>
              </div>
              <div class="p-8 border border-slate-200 bg-white rounded-3xl shadow-premium border-l-4 border-l-orange-500">
                <h4 class="font-black text-2xl text-slate-900 tracking-tight mb-4">Type II</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Evaluates <strong>operational effectiveness</strong> over a period (usually 6–12 months). This is what enterprise clients demand.
                </p>
                <div class="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg w-fit text-xs font-bold text-orange-700 uppercase tracking-widest">
                  Operating Effectiveness
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "lifecycle",
        title: "The Path to Compliance",
        icon: Activity,
        content: `
          <div class="space-y-6">
             <p class="text-slate-600 font-medium text-lg leading-relaxed">The SOC 2 journey is a cycle that transforms security from a cost center into a powerful business enabler.</p>
            <div class="relative space-y-8 mt-10 ml-6">
              <div class="absolute left-0 top-2 bottom-2 w-1 bg-slate-100 rounded-full" />
              
              <div class="relative pl-10 group">
                <div class="absolute -left-3 top-0 w-7 h-7 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-black text-xs text-slate-400 group-hover:border-orange-500 group-hover:text-orange-500 transition-all">1</div>
                <h4 class="font-black text-slate-900 tracking-tight leading-none mb-2">Readiness Strategy</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Perform a gap analysis against the TSC. Map your existing controls and identify necessary remediations.</p>
              </div>

              <div class="relative pl-10 group">
                <div class="absolute -left-3 top-0 w-7 h-7 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-black text-xs text-slate-400 group-hover:border-orange-500 group-hover:text-orange-500 transition-all">2</div>
                <h4 class="font-black text-slate-900 tracking-tight leading-none mb-2">Technical Remediation</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Implementing technical controls (MFA, encryption, logs) and operationalizing security policies across the firm.</p>
              </div>

              <div class="relative pl-10 group">
                <div class="absolute -left-3 top-0 w-7 h-7 bg-white border-2 border-orange-500 rounded-full flex items-center justify-center font-black text-xs text-orange-500 animate-pulse">3</div>
                <h4 class="font-black text-orange-600 tracking-tight leading-none mb-2">Observation & Audit</h4>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">The observation window (3-12 months) begins. The auditor collects evidence to prove controls are operating consistently.</p>
              </div>
            </div>
          </div>
        `
      }
    ]
  },
  "gdpr": {
    id: "gdpr",
    title: "GDPR",
    description: "General Data Protection Regulation - The world's most comprehensive privacy law.",
    color: "bg-yellow-500",
    sections: [
      {
        id: "intro",
        title: "The Gold Standard for Privacy",
        icon: Globe,
        content: `
          <div class="space-y-6">
            <div class="p-8 border border-slate-200" style="background: #ffffff !important; border-radius: 20px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important; border-left: 6px solid #eab308 !important;">
              <h4 class="text-2xl font-black text-slate-900 mb-4 tracking-tight">Global Data Protection</h4>
              <p class="text-lg leading-relaxed text-slate-600 font-medium">
                The GDPR is the most influential privacy and security law in the world. It regulates how organizations collect, use, and protect the personal data of individuals in the EU, regardless of where the organization is located.
              </p>
              <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-sm italic font-bold mt-6 flex items-center gap-3">
                <span class="text-2xl">⚡</span> "If you process data of EU citizens, you are in scope—wherever you are."
              </div>
            </div>
          </div>
        `
      },
      {
        id: "principles",
        title: "The 7 Core Principles",
        icon: Server,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">Everything in GDPR flows from these seven fundamental processing principles:</p>
            <div class="grid gap-3">
              <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xs group-hover:bg-yellow-500 group-hover:text-white transition-colors">1</div>
                <div class="text-sm font-bold text-slate-800">Transparency: <span class="text-slate-500 font-medium">Lawful, fair, and clear processing.</span></div>
              </div>
              <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xs group-hover:bg-yellow-500 group-hover:text-white transition-colors">2</div>
                <div class="text-sm font-bold text-slate-800">Purpose Limitation: <span class="text-slate-500 font-medium">Only collect for specific, legitimate reasons.</span></div>
              </div>
              <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xs group-hover:bg-yellow-500 group-hover:text-white transition-colors">3</div>
                <div class="text-sm font-bold text-slate-800">Data Minimization: <span class="text-slate-500 font-medium">Only collect what is strictly necessary.</span></div>
              </div>
              <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xs group-hover:bg-yellow-500 group-hover:text-white transition-colors">4</div>
                <div class="text-sm font-bold text-slate-800">Accuracy: <span class="text-slate-500 font-medium">Keep data precise and up to date.</span></div>
              </div>
              <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xs group-hover:bg-yellow-500 group-hover:text-white transition-colors">5</div>
                <div class="text-sm font-bold text-slate-800">Storage Limitation: <span class="text-slate-500 font-medium">Delete data when it's no longer needed.</span></div>
              </div>
              <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xs group-hover:bg-yellow-500 group-hover:text-white transition-colors">6</div>
                <div class="text-sm font-bold text-slate-800">Integrity: <span class="text-slate-500 font-medium">Maintain security and confidentiality.</span></div>
              </div>
              <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-black text-xs">7</div>
                <div class="text-sm font-black text-yellow-800 tracking-tight">Accountability: <span class="text-yellow-700 opacity-80 font-bold">You must be able to prove your compliance.</span></div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "rights",
        title: "The 8 Data Subject Rights",
        icon: UserCheck,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">GDPR gives individuals significant control over their own data. These rights must be addressable by your organization.</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">👁️</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Access</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">🗑️</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Erasure</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">✏️</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Rectify</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">📦</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Portability</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">🚫</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Object</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">🔒</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Restrict</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">📝</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Informed</div>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-yellow-400 transition-all text-center">
                <div class="text-3xl mb-3">🤖</div>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Profiling</div>
              </div>
            </div>
          </div>
        `
      }
    ]
  },
  "hipaa": {
    id: "hipaa",
    title: "HIPAA",
    description: "The US healthcare standard for digital patient security and privacy.",
    color: "bg-teal-600",
    sections: [
      {
        id: "intro",
        title: "The Gold Standard for Healthcare",
        icon: Activity,
        content: `
          <div class="space-y-6">
            <div class="p-8 border border-slate-200" style="background: #ffffff !important; border-radius: 20px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important; border-left: 6px solid #0d9488 !important;">
              <h4 class="text-2xl font-black text-slate-900 mb-4 tracking-tight">Patient Data Privacy</h4>
              <p class="text-lg leading-relaxed text-slate-600 font-medium">
                The Health Insurance Portability and Accountability Act (HIPAA) sets the national standard for protecting sensitive patient data (PHI). Any organization that provides healthcare services or handles PHI must comply.
              </p>
              <div class="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                <div class="flex-1 p-5 rounded-xl bg-teal-50 border border-teal-100">
                  <h5 class="font-bold text-teal-700 text-sm uppercase tracking-wider mb-2 text-center">Privacy Rule</h5>
                  <p class="text-xs text-teal-800 leading-relaxed font-semibold text-center italic">Protects patient records and other health info.</p>
                </div>
                <div class="flex-1 p-5 rounded-xl bg-teal-50 border border-teal-100">
                  <h5 class="font-bold text-teal-700 text-sm uppercase tracking-wider mb-2 text-center">Security Rule</h5>
                  <p class="text-xs text-teal-800 leading-relaxed font-semibold text-center italic">Sets standards for electronic patient data protection.</p>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "safeguards",
        title: "The 3 Security Safeguards",
        icon: Shield,
        content: `
          <div class="space-y-6">
            <p class="text-slate-600 font-medium text-lg leading-relaxed">The HIPAA Security Rule defines three types of safeguards that must be implemented:</p>
            <div class="grid gap-4">
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-teal-400 group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">1. Administrative Safeguards</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Policies and procedures used to manage workforce conduct and security measures (e.g., Risk Analysis, Training).</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-teal-500 group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">2. Physical Safeguards</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">Protection of physical systems and hardware from unauthorized physical access or theft (e.g., Facility Access, Device Security).</p>
              </div>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-teal-600 group">
                <h5 class="font-black text-slate-900 mb-2 tracking-tight">3. Technical Safeguards</h5>
                <p class="text-sm text-slate-500 font-medium leading-relaxed">The technology and policy/procedures for its use that protect e-PHI (e.g., Access Control, Audit Controls, Encryption).</p>
              </div>
            </div>
          </div>
        `
      }
    ]
  },
  "cmmc": {
    id: "cmmc",
    title: "CMMC",
    description: "The defense supply chain standard for cybersecurity maturity.",
    color: "bg-indigo-700",
    sections: [
      {
        id: "intro",
        title: "What is CMMC 2.0?",
        icon: Shield,
        content: `
          <div class="space-y-6">
            <div class="p-7 border border-slate-200" style="background: #ffffff !important; border-radius: 16px !important; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05) !important;">
              <p class="text-lg leading-relaxed text-slate-700 font-medium mb-6">
                The core mission of the Cybersecurity Maturity Model Certification (CMMC) is to standardize cybersecurity across the **Defense Industrial Base (DIB)** of 300,000+ contractors.
              </p>
              <div class="p-6 border flex flex-col shadow-sm" style="background: #eef2ff !important; border: 1px solid #c7d2fe !important; border-left: 5px solid #4338ca !important; border-radius: 12px !important;">
                <h4 class="font-bold text-lg mb-2" style="color: #3730a3; margin: 0 !important;">The License to Trade</h4>
                <p class="text-sm" style="color: #312e81; margin-top: 8px !important;">CMMC is a mandatory requirement. Without an active certification at the level specified in the contract, your organization is formally prohibited from bidding on or performing DoD-related work.</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "data-types",
        title: "Protection Targets: FCI vs CUI",
        icon: Database,
        content: `
          <div class="grid md:grid-cols-2 gap-6">
            <div class="p-6 border" style="background: #ffffff !important; border-radius: 12px !important; border-top: 5px solid #94a3b8 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important;">
              <h5 class="font-bold text-slate-900 mb-2">FCI (Federal Contract Info)</h5>
              <p class="text-sm text-slate-600 mb-4">Information not intended for public release that is provided by or generated for the Government under a contract.</p>
              <span style="background: #f1f5f9 !important; color: #475569 !important; padding: 3px 10px !important; border-radius: 20px !important; font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important;">Target for Level 1</span>
            </div>
            <div class="p-6 border" style="background: #ffffff !important; border-radius: 12px !important; border-top: 5px solid #4338ca !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important;">
              <h5 class="font-bold text-indigo-900 mb-2">CUI (Controlled Unclassified Info)</h5>
              <p class="text-sm text-slate-600 mb-4">Information that requires safeguarding or dissemination controls pursuant to and consistent with law, regulations, and Government policies.</p>
              <span style="background: #eef2ff !important; color: #3730a3 !important; padding: 3px 10px !important; border-radius: 20px !important; font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important;">Target for Level 2+</span>
            </div>
          </div>
        `
      },
      {
        id: "levels",
        title: "The 3 Maturity Levels",
        icon: Activity,
        content: `
          <div class="space-y-6">
            <p class="text-muted-foreground">CMMC 2.0 simplifies the previous 5-level model into three tiers based on NIST 800-171.</p>
            
            <div class="p-6 border flex gap-6" style="background: #ffffff !important; border-radius: 14px !important; box-shadow: 0 2px 8px -2px rgba(0,0,0,0.08) !important; border: 1px solid #e2e8f0 !important;">
               <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0 shadow-inner">1</div>
               <div>
                 <h5 class="font-bold text-slate-900 text-lg">Level 1: Foundational</h5>
                 <p class="text-sm text-slate-600 mt-1 mb-3">17 Security Practices focusing on the safeguarding of FCI. Evaluated via annual self-assessments.</p>
                 <div class="flex gap-2">
                    <div style="font-size: 10px; font-weight: 800; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px;">Self-Assessment</div>
                 </div>
               </div>
            </div>

            <div class="p-6 border flex gap-6" style="background: #ffffff !important; border-radius: 14px !important; box-shadow: 0 4px 15px -4px rgba(67, 56, 202, 0.15) !important; border: 1px solid #c7d2fe !important; border-left: 6px solid #4338ca !important;">
               <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-lg">2</div>
               <div>
                 <h5 class="font-bold text-indigo-950 text-xl">Level 2: Advanced</h5>
                 <p class="text-base text-indigo-900/80 mt-1 mb-3">110 Controls mirroring **NIST SP 800-171**. The requirement for any contractor handling CUI.</p>
                 <div class="flex gap-2">
                    <div style="font-size: 10px; font-weight: 800; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 4px;">Audited (C3PAO)</div>
                    <div style="font-size: 10px; font-weight: 800; background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 2px 8px; border-radius: 4px;">Milestone Requirement</div>
                 </div>
               </div>
            </div>

            <div class="p-6 border flex gap-6" style="background: #ffffff !important; border-radius: 14px !important; box-shadow: 0 2px 8px -2px rgba(0,0,0,0.08) !important; border: 1px solid #e2e8f0 !important;">
               <div class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0 shadow-inner">3</div>
               <div>
                 <h5 class="font-bold text-slate-900 text-lg">Level 3: Expert</h5>
                 <p class="text-sm text-slate-600 mt-1 mb-3">110+ Controls based on NIST 800-172 for higher priority programs. Triennial assessments led by the Government (DIBCAC).</p>
               </div>
            </div>
          </div>
        `
      },
      {
        id: "certification-path",
        title: "The Path to Certification",
        icon: UserCheck,
        content: `
          <div class="space-y-4">
            <p>Unlike other frameworks, CMMC requires specific artifacts before the audit starts.</p>
            <div class="grid md:grid-cols-2 gap-4">
              <div class="p-5 border" style="background: #ffffff !important; border-radius: 12px !important; border-left: 5px solid #059669 !important;">
                <h6 class="font-bold text-emerald-900 mb-1">SSP (System Security Plan)</h6>
                <p class="text-xs text-emerald-700">The master document describing how your security controls fulfill the 110 requirements.</p>
              </div>
              <div class="p-5 border" style="background: #ffffff !important; border-radius: 12px !important; border-left: 5px solid #d97706 !important;">
                <h6 class="font-bold text-amber-900 mb-1">POA&M (Plan of Action)</h6>
                <p class="text-xs text-amber-700">The 'remediation tracker'. Lists controls not yet met and the deadline for completion.</p>
              </div>
            </div>
            <div class="p-5 border text-center mt-4" style="background: #f8fafc !important; border: 1px dashed #cbd5e1 !important; border-radius: 12px !important;">
              <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Audit Entity</p>
              <h5 class="font-bold text-slate-900">C3PAO (Certified 3rd Party Assessor Org)</h5>
              <p class="text-xs text-slate-600 mt-2">To achieve Level 2, you must be audited by an accredited organization from the Cyber AB ecosystem.</p>
            </div>
          </div>
        `
      }
    ]
  },
  "pci-dss": {
    id: "pci-dss",
    title: "PCI DSS",
    description: "Payment Card Industry Data Security Standard - Protecting global cardholder data.",
    color: "bg-red-700",
    sections: [
      {
        id: "intro",
        title: "What is PCI DSS?",
        icon: Shield,
        content: `
          <div class="space-y-6">
            <div class="p-7 border border-slate-200" style="background: #ffffff !important; border-radius: 16px !important; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05) !important;">
              <p class="text-lg leading-relaxed text-slate-700 font-medium mb-6">
                The Payment Card Industry Data Security Standard (PCI DSS) is a set of security standards designed to ensure that ALL companies that accept, process, store or transmit credit card information maintain a secure environment.
              </p>
              <div class="p-6 border flex flex-col shadow-sm" style="background: #fef2f2 !important; border: 1px solid #fecaca !important; border-left: 5px solid #dc2626 !important; border-radius: 12px !important;">
                <h4 class="font-bold text-lg mb-2" style="color: #991b1b; margin: 0 !important;">The Mandate</h4>
                <p class="text-sm" style="color: #7f1d1d; margin-top: 8px !important;">PCI DSS is not a law, but it is a contractual requirement for any merchant using credit card networks (Visa, Mastercard, Amex, etc.).</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "requirements",
        title: "The 12 Requirements",
        icon: FileText,
        content: `
          <div class="grid md:grid-cols-2 gap-4">
            <div class="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <h6 class="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Network Security</h6>
              <ul class="text-xs text-slate-600 space-y-1">
                <li>1. Install and maintain firewalls</li>
                <li>2. Change vendor-supplied defaults</li>
              </ul>
            </div>
            <div class="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <h6 class="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Stored Data</h6>
              <ul class="text-xs text-slate-600 space-y-1">
                <li>3. Protect stored cardholder data</li>
                <li>4. Encrypt data across open networks</li>
              </ul>
            </div>
            <div class="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <h6 class="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Vulnerability Mgmt</h6>
              <ul class="text-xs text-slate-600 space-y-1">
                <li>5. Use and update anti-virus</li>
                <li>6. Develop secure systems/apps</li>
              </ul>
            </div>
            <div class="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <h6 class="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Access Control</h6>
              <ul class="text-xs text-slate-600 space-y-1">
                <li>7. Restrict access by business need</li>
                <li>8. Unique ID for each user</li>
                <li>9. Restrict physical access</li>
              </ul>
            </div>
          </div>
        `
      },
      {
        id: "certification-path",
        title: "Path to Compliance",
        icon: UserCheck,
        content: `
          <div class="space-y-6">
            <div class="p-7 border border-slate-200" style="background: #ffffff !important; border-radius: 16px !important; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05) !important;">
              <h5 class="font-bold text-slate-900 mb-4">Assessment Methods</h5>
              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <h6 class="font-bold text-sm text-red-700">SAQ (Self-Assessment Questionnaire)</h6>
                  <p class="text-xs text-slate-600 mt-2">For smaller merchants. Varies from SAQ A (full outsource) to SAQ D (all other merchants).</p>
                </div>
                <div>
                  <h6 class="font-bold text-sm text-red-700">ROC (Report on Compliance)</h6>
                  <p class="text-xs text-slate-600 mt-2">Required for Level 1 merchants. Conducted by a Qualified Security Assessor (QSA).</p>
                </div>
              </div>
              <div class="mt-6 pt-6 border-t border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
                  </div>
                  <div>
                    <h6 class="font-bold text-sm text-slate-900">AOC (Attestation of Compliance)</h6>
                    <p class="text-xs text-slate-500">The final form signed off to declare your compliance status to the bank.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `
      }
    ]
  },
  "nist-csf": {
    id: "nist-csf",
    title: "NIST CSF 2.0",
    description: "The gold standard for cybersecurity framework - Focus on outcome and business risk.",
    color: "bg-blue-900",
    sections: [
      {
        id: "intro",
        title: "Core Functions (v2.0)",
        icon: Activity,
        content: `
          <div class="space-y-6">
            <p class="text-muted-foreground">Updated in 2024, the CSF 2.0 adds "Govern" as the sixth core function at the center of the wheel.</p>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="p-5 border text-center" style="background: #ffffff !important; border-radius: 12px; border-bottom: 4px solid #4f46e5;">
                <div class="text-2xl mb-2">🏛️</div>
                <h6 class="font-bold text-xs uppercase tracking-widest text-slate-900">Govern</h6>
                <p class="text-[10px] text-slate-500 mt-1">Strategy & Risk</p>
              </div>
              <div class="p-5 border text-center" style="background: #ffffff !important; border-radius: 12px; border-bottom: 4px solid #0ea5e9;">
                <div class="text-2xl mb-2">🔍</div>
                <h6 class="font-bold text-xs uppercase tracking-widest text-slate-900">Identify</h6>
                <p class="text-[10px] text-slate-500 mt-1">Asset Mgmt</p>
              </div>
              <div class="p-5 border text-center" style="background: #ffffff !important; border-radius: 12px; border-bottom: 4px solid #10b981;">
                <div class="text-2xl mb-2">🛡️</div>
                <h6 class="font-bold text-xs uppercase tracking-widest text-slate-900">Protect</h6>
                <p class="text-[10px] text-slate-500 mt-1">Access Control</p>
              </div>
              <div class="p-5 border text-center" style="background: #ffffff !important; border-radius: 12px; border-bottom: 4px solid #f59e0b;">
                <div class="text-2xl mb-2">🚨</div>
                <h6 class="font-bold text-xs uppercase tracking-widest text-slate-900">Detect</h6>
                <p class="text-[10px] text-slate-500 mt-1">Situational Awareness</p>
              </div>
              <div class="p-5 border text-center" style="background: #ffffff !important; border-radius: 12px; border-bottom: 4px solid #f97316;">
                <div class="text-2xl mb-2">⚡</div>
                <h6 class="font-bold text-xs uppercase tracking-widest text-slate-900">Respond</h6>
                <p class="text-[10px] text-slate-500 mt-1">Mitigation</p>
              </div>
              <div class="p-5 border text-center" style="background: #ffffff !important; border-radius: 12px; border-bottom: 4px solid #be185d;">
                <div class="text-2xl mb-2">🔄</div>
                <h6 class="font-bold text-xs uppercase tracking-widest text-slate-900">Recover</h6>
                <p class="text-[10px] text-slate-500 mt-1">Resilience</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: "mapping",
        title: "Tiers & Implementation",
        icon: FileText,
        content: `
          <div class="space-y-6">
            <div class="p-7 border border-slate-200" style="background: #ffffff !important; border-radius: 16px !important; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05) !important;">
              <h5 class="font-bold text-slate-900 mb-4">Framework Implementation Tiers</h5>
              <div class="space-y-3">
                <div class="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg">
                  <span class="text-xs font-bold text-slate-400">01</span>
                  <span class="text-sm font-medium">Partial - Ad-hoc and reactive</span>
                </div>
                <div class="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg">
                  <span class="text-xs font-bold text-slate-500">02</span>
                  <span class="text-sm font-medium">Risk Informed - Aware but unstandardized</span>
                </div>
                <div class="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span class="text-xs font-bold text-blue-600">03</span>
                  <span class="text-sm font-bold text-blue-900">Repeatable - Formally approved policies</span>
                </div>
                <div class="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <span class="text-xs font-bold text-indigo-600">04</span>
                  <span class="text-sm font-bold text-indigo-900">Adaptive - Continuous improvement</span>
                </div>
              </div>
            </div>
          </div>
        `
      }
    ]
  }
};
