/**
 * Phase 4: Evidence, Privacy (ROPA/DPIA/DSAR/breaches/transfers), BCP,
 * Vendors + assessments, Access reviews, AI governance, Audit findings.
 */
import { Rng, bulkInsert, agoDays, daysFromNow, log } from "./util.mjs";

export async function seedPhase4(sql, clientId, slug) {
  const rng = new Rng(6000 + clientId);
  const out = {};
  const emps = await sql`SELECT id, first_name, last_name FROM employees WHERE client_id = ${clientId}`;
  const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };
  const userIds = (await sql`SELECT user_id FROM user_clients WHERE client_id=${clientId}`).map(r => r.user_id);
  const isEU = slug === "nordwind";
  const tenantName = isEU ? "Nordwind Logistics GmbH" : "Apex Federal Solutions Inc.";

  // ============ EVIDENCE ============
  const ccs = await sql`
    SELECT cc.id, cc.client_control_id, c.framework
    FROM client_controls cc JOIN controls c ON c.id = cc.control_id
    WHERE cc.client_id=${clientId} AND cc.status='implemented'`;
  const evRows = [];
  let evIdx = 0;
  for (const cc of ccs) {
    if (!rng.chance(0.7)) continue;
    evIdx++;
    const status = rng.weighted([["verified", 55], ["collected", 25], ["pending", 15], ["expired", 5]]);
    evRows.push({
      client_id: clientId,
      client_control_id: cc.id,
      evidence_id: `EV-${String(evIdx).padStart(4, "0")}`,
      description: `Evidence package for control ${cc.client_control_id} (${cc.framework}): configuration exports, screenshots and review sign-offs.`,
      type: rng.pick(["configuration_export", "screenshot", "policy_document", "log_extract", "attestation", "test_report"]),
      status,
      owner: empName(),
      location: `repo://evidence/${slug}/${cc.client_control_id}/`,
      framework: cc.framework,
      due_date: daysFromNow(rng.int(-10, 90)),
      file_count: rng.int(1, 8),
      system_id: null,
      last_verified: status === "verified" ? agoDays(rng.int(1, 60)) : null,
      expiration_date: status === "expired" ? agoDays(rng.int(1, 30)) : daysFromNow(rng.int(30, 365)),
      interval_days: rng.pick([90, 180, 365]),
      created_at: agoDays(rng.int(30, 300)),
      updated_at: agoDays(rng.int(0, 20)),
    });
  }
  out.evidence = await bulkInsert(sql, "evidence",
    ["client_id","client_control_id","evidence_id","description","type","status","owner","location","framework","due_date","file_count","last_verified","expiration_date","interval_days","created_at","updated_at"], evRows);

  // ============ VENDORS ============
  const VENDORS = isEU ? [
    ["Microsoft Ireland Operations Ltd", "Cloud & Productivity", "Very High", "EU (Ireland)", true],
    ["Amazon Web Services EMEA SARL", "Cloud Hosting", "Very High", "EU (Germany)", true],
    ["Webfleet Solutions BV", "Fleet Telematics", "High", "EU (Netherlands)", true],
    ["Datev eG", "Payroll & Finance SaaS", "High", "EU (Germany)", true],
    ["Personio GmbH", "HR SaaS", "High", "EU (Germany)", true],
    ["Zendesk (EU instance)", "Support Desk", "Medium", "EU", true],
    ["Wasabi Technologies (EU region)", "Backup Storage", "High", "EU (France)", false],
    ["Seeburger AG", "EDI Gateway", "High", "EU (Germany)", false],
    ["Fortinet Distribution Partner", "Network Hardware", "Medium", "Non-EU support", false],
    ["Zebra Technologies", "Warehouse Hardware", "Medium", "Non-EU", false],
    ["idha.online (RIO)", "Tachograph Analysis", "Medium", "EU (Germany)", true],
    ["Vercel Inc. (EU edge)", "Website Hosting", "Low", "EU", false],
    ["Okta Inc.", "Identity Pilot", "Low", "US with SCCs", true],
    ["Kaspersky partner (terminated)", "Legacy AV vendor", "Low", "Terminated Q2", false],
  ] : [
    ["Amazon Web Services (GovCloud)", "Cloud Hosting", "Very High", "US GovCloud", false],
    ["Atlassian Government Cloud", "Collaboration", "Medium", "US GovCloud", false],
    ["Splunk LLC (Cisco)", "SIEM", "Very High", "US GovCloud", false],
    ["Tanium Inc.", "Endpoint Mgmt", "High", "US", false],
    ["Deltek (GovWin/Costpoint)", "Contract Management", "High", "US", false],
    ["Skillsoft Corporation", "Training LMS", "Medium", "US", false],
    ["Microsoft 365 GCC", "Productivity", "High", "US Gov cloud", false],
    ["Carahsoft Technology Corp", "Reseller", "Medium", "US", false],
    ["CrowdStrike Services", "IR Retainer", "Medium", "US", false],
    ["Expedient Data Centers", "Colocation/DR", "High", "US (Ashburn)", false],
    ["ClearCheck / FSO screening vendor", "Personnel Security", "Medium", "US", false],
    ["Iron Mountain (tape vault)", "Offsite Storage", "Medium", "US", false],
  ];
  const vendorRows = VENDORS.map(([name, category, criticality, dataLoc, pd], i) => ({
    client_id: clientId,
    name,
    description: `${category} provider used by ${tenantName}.`,
    category,
    criticality: criticality.toLowerCase(),
    data_access: pd ? "processes personal/confidential data on our behalf" : "no sensitive data access",
    status: name.includes("terminated") ? "offboarding" : "active",
    owner_id: userIds[0],
    security_owner_id: userIds[0],
    source: "manual",
    discovery_date: agoDays(rng.int(200, 1500)),
    review_status: rng.weighted([["approved", 50],["in_review", 25],["pending", 15],["flagged", 10]]),
    trust_center_url: rng.chance(0.5) ? `https://trust.${name.split(" ")[0].toLowerCase().replace(/[^a-z]/g,"")}.example` : null,
    trust_score: rng.chance(0.6) ? rng.int(55, 98) : null,
    service_description: category,
    is_subprocessor: false,
    data_location: dataLoc,
    transfer_mechanism: dataLoc.includes("SCC") || dataLoc.includes("Non-EU") ? "scc_2021" : (isEU && !dataLoc.includes("EU") ? "adequacy" : null),
    uses_ai: rng.chance(0.2),
    is_ai_service: false,
    nis2_category: isEU && (criticality === "Very High" || criticality === "High") ? "important" : null,
    created_at: agoDays(rng.int(100, 1400)),
    updated_at: agoDays(rng.int(0, 60)),
  }));
  out.vendors = await bulkInsert(sql, "vendors",
    ["client_id","name","description","category","criticality","data_access","status","owner_id","security_owner_id","source","discovery_date","review_status","trust_center_url","trust_score","service_description","is_subprocessor","data_location","transfer_mechanism","uses_ai","is_ai_service","nis2_category","created_at","updated_at"], vendorRows);

  // --- vendor assessments ---
  const vIds = (await sql`SELECT id FROM vendors WHERE client_id=${clientId}`).map(v => v.id);
  const vaRows = [];
  for (const vid of vIds) {
    if (!rng.chance(0.75)) continue;
    const done = rng.chance(0.7);
    vaRows.push({
      client_id: clientId,
      vendor_id: vid,
      type: rng.pick(["security_questionnaire", "soc2_review", "penetration_test_summary", "onboarding_assessment", "annual_reassessment"]),
      status: done ? "completed" : rng.pick(["pending", "in_progress", "overdue"]),
      score: done ? rng.int(45, 98) : null,
      findings: done ? JSON.stringify({
        summary: "Vendor demonstrates adequate security posture; minor findings tracked to closure.",
        items: [
          { finding: "Annual penetration test report not shared under NDA timeline", severity: "low" },
          { finding: "Subprocessor list updated quarterly — acceptable", severity: "info" },
        ],
      }) : JSON.stringify({ summary: "Assessment initiated; questionnaire outstanding." }),
      due_date: daysFromNow(rng.int(-30, 60)),
      completed_date: done ? agoDays(rng.int(1, 120)) : null,
      inherent_impact: rng.int(2, 5), inherent_likelihood: rng.int(2, 4),
      inherent_risk_level: rng.pick(["Low", "Medium", "High"]),
      residual_impact: rng.int(1, 3), residual_likelihood: rng.int(1, 3),
      residual_risk_level: rng.pick(["Low", "Medium"]),
      review_status: done ? "reviewed" : "pending",
      created_at: agoDays(rng.int(30, 400)),
      updated_at: agoDays(rng.int(0, 40)),
    });
  }
  out.vendor_assessments = await bulkInsert(sql, "vendor_assessments",
    ["client_id","vendor_id","type","status","score","findings","due_date","completed_date","inherent_impact","inherent_likelihood","inherent_risk_level","residual_impact","residual_likelihood","residual_risk_level","review_status","created_at","updated_at"], vaRows);

  // ============ BUSINESS CONTINUITY ============
  if (!isEU) {} // both tenants get BCP
  const bcProgram = await sql`INSERT INTO bc_programs DEFAULT VALUES RETURNING id`.catch(() => [{ id: null }]);
  const BCP = isEU ? [
    ["CargoTrack Platform Continuity Plan", "Cross-region failover for TMS: Aurora multi-AZ, API gateway blue/green, portal static hosting fallback. RTO 4h, RPO 15min."],
    ["Warehouse Operations Disruption Plan", "Manual picking procedures, alternate cross-dock routing via Hamburg/Rotterdam, scanner offline mode."],
    ["Finance System Recovery Plan", "SAP restart runbook, Datev re-submission procedure, payment continuity via bank portals."],
    ["Crisis Communication Plan", "Escalation tree, customer notification templates, authority liaison (BSI, supervisory authority)."],
  ] : [
    ["ApexCloud Gov Continuity Plan", "GovCloud multi-AZ failover for control plane and SFE; agency customer notification per contract SLAs. RTO 8h, RPO 1h."],
    ["CUI Enclave Recovery Plan", "Enclave rebuild from immutable backups; PKI recovery via HSM backup; SSP deviation authorization procedure."],
    ["Corporate IT Recovery Plan", "M365 GCC restore, Deltek availability, payroll continuity."],
    ["Crisis Communication Plan", "Customer agency POC notification tree, CISA reporting coordination, PR holding statements."],
  ];
  const bcRows = BCP.map(([title, content], i) => ({
    client_id: clientId,
    title,
    version: rng.int(2, 4),
    status: i < 3 ? "approved" : "draft",
    owner_id: userIds[0],
    last_tested_date: agoDays(rng.int(30, 400)),
    next_test_date: daysFromNow(rng.int(20, 300)),
    content: `# ${title}\n\n${content}\n\n## Activation criteria\nDocumented trigger conditions and authority to activate.\n\n## Recovery teams\nRoles, contacts and call tree maintained in the GRC platform.\n\n## Test schedule\nTabletop annually; full failover test at least every 12 months.`,
    created_at: agoDays(rng.int(100, 500)),
    updated_at: agoDays(rng.int(0, 45)),
  }));
  out.bc_plans = await bulkInsert(sql, "bc_plans",
    ["client_id","title","version","status","owner_id","last_tested_date","next_test_date","content","created_at","updated_at"], bcRows);

  // scenarios
  const SCEN = isEU ? [
    ["Regional power outage Munich DC-1", "Extended utility failure affecting primary data center; UPS/generator bridge 8h then controlled shutdown.", 2, 4],
    ["Ransomware halts WMS operations", "Warehouse management unavailable during peak season.", 3, 5],
    ["Loss of CargoTrack database cluster", "Corruption or failover failure in Aurora.", 2, 5],
    ["Key supplier insolvency (telematics vendor)", "Sudden loss of fleet tracking capability.", 2, 3],
  ] : [
    ["GovCloud regional outage us-gov-east-1", "AWS regional disruption affecting production CSP services.", 2, 5],
    ["Ransomware on corporate network", "Delivery disruption while enclave remains isolated.", 3, 4],
    ["Loss of cleared key personnel", "Sudden departure of program-cleared staff.", 3, 3],
    ["SCIF access system failure", "Badge+PIN system outage restricting facility access.", 2, 3],
  ];
  const scenRows = SCEN.map(([title, description, likelihood, potential_impact]) => ({
    client_id: clientId,
    title,
    description,
    likelihood,
    potential_impact,
    mitigation_strategies: "Preventive controls in risk register; BC plans cover response and recovery; tested annually.",
    created_at: agoDays(rng.int(30, 300)),
  }));
  out.bc_scenarios = await bulkInsert(sql, "disruptive_scenarios",
    ["client_id","title","description","likelihood","potential_impact","mitigation_strategies","created_at"], scenRows);

  // ============ PRIVACY (Nordwind deep; Apex light) ============
  if (isEU) {
    const ROPA = [
      ["Freight Order Processing", "Handling of consignee names, addresses and delivery data to execute transport contracts.", "performance_of_contract", "Customers", "Name, address, phone, email, shipment contents category", "Consignment and delivery records", "Order fulfillment, POD, invoicing", "10 years (commercial law)", true, "Switzerland", "adequacy"],
      ["Driver Telemetry Processing", "GPS and driving-time data of employed drivers for legal compliance and fleet safety.", "legal_obligation", "Employees", "Location data, working time, driving license classes", "Driver conduct and hours data", "EU driving time compliance, safety", "3 years", false, null, null],
      ["HR Personnel Administration", "Employee master data administration across the employment lifecycle.", "performance_of_contract", "Employees", "Contact details, bank details, tax ID, qualifications", "Personnel files", "Payroll, benefits, statutory reporting", "Per statutory retention (6-10y)", false, null, null],
      ["CCTV at Warehouse Facilities", "Video surveillance of dock doors and yards for property protection.", "legitimate_interests", "Visitors, staff, drivers", "Video recordings", "Footage metadata", "Property protection, theft prevention", "30 days", false, null, null],
      ["Customer Support (Zendesk)", "Processing of support requests including identity data of contact persons.", "performance_of_contract", "Customers", "Name, email, correspondence", "Ticket history", "Service request handling", "24 months", true, "United States", "scc_2021"],
      ["Marketing Newsletter", "Direct marketing to business contacts with opt-in consent.", "consent", "Prospects, customers", "Name, business email, sector", "Subscription lists", "Newsletter distribution", "Until withdrawal + 3 years", false, null, null],
      ["Recruiting Applicant Management", "Applicant data processing during hiring.", "consent/pre-contractual", "Applicants", "CV, references, interview notes", "Application files", "Hiring decisions", "6 months post-decision (or consent period)", false, null, null],
      ["Supplier Invoice Processing", "Financial administration of supplier relationships.", "legal_obligation", "Suppliers", "Contact persons, bank details, invoice data", "Accounts payable records", "Payment execution, audits", "10 years", false, null, null],
    ];
    const ropaCols = ["client_id","activity_name","activity_id","description","role","controller_name","purposes","legal_basis","data_categories","data_subject_categories","recipients","retention_period","has_international_transfers","transfer_countries","transfer_safeguards","status","last_review_date","next_review_date","created_by","technical_measures","organizational_measures"];
    const ropaRows = ROPA.map(([name, desc, basis, subjects, cats, recCat, purposes, retention, xfer, country, safeguard], i) => ({
      client_id: clientId,
      activity_name: name,
      activity_id: `ROPA-${String(i+1).padStart(3,'0')}`,
      description: desc,
      role: "controller",
      controller_name: tenantName,
      purposes,
      legal_basis: basis.split("/")[0],
      data_categories: cats,
      data_subject_categories: subjects,
      recipients: recCat,
      retention_period: retention,
      has_international_transfers: xfer,
      transfer_countries: country,
      transfer_safeguards: safeguard === "adequacy" ? "adequacy" : safeguard === "scc_2021" ? "Standard Contractual Clauses (2021/914 module 2)" : null,
      status: "active",
      last_review_date: agoDays(rng.int(10, 150)),
      next_review_date: daysFromNow(rng.int(30, 330)),
      created_by: userIds[0],
      technical_measures: "Encryption at rest/in transit, RBAC, pseudonymization where feasible",
      organizational_measures: "DPO oversight, DPAs with processors, staff training, access approval workflow",
    }));
    out.ropa = await bulkInsert(sql, "processing_activities", ropaCols, ropaRows);

    // DPIAs
    const DPIA = [
      ["DPIA: Fleet Telematics Driver Monitoring", "Continuous location monitoring of drivers engages Art. 35 — systematic monitoring of employees.", "completed"],
      ["DPIA: CCTV Expansion Rotterdam", "Expansion of surveillance coverage to new yard area.", "under_review"],
      ["DPIA: AI-based ETA Prediction", "ML model processing order and traffic data; assesses profiling impact on consignees.", "in_progress"],
    ];
    const dpiaCols = ["client_id","title","description","scope","identified_risks","mitigation_measures","status","assigned_to","last_review_date","created_at","updated_at"];
    const dpiaRows = DPIA.map(([title, desc, status]) => ({
      client_id: clientId,
      title,
      description: desc,
      scope: "Systems and processes listed in ROPA entries referenced; consult DPO, IT, Legal.",
      identified_risks: JSON.stringify([
        { risk: "Function creep beyond stated purpose", severity: "medium" },
        { risk: "Insufficient transparency to data subjects", severity: "medium" },
        { risk: "Unauthorized access to monitoring data", severity: "high" },
      ]),
      mitigation_measures: JSON.stringify([
        "Access restricted to named roles; logging of views",
        "Updated privacy notices and works council agreement",
        "Retention limits enforced technically",
      ]),
      status,
      assigned_to: userIds[0],
      last_review_date: agoDays(rng.int(5, 90)),
      created_at: agoDays(rng.int(30, 200)),
      updated_at: agoDays(rng.int(0, 30)),
    }));
    out.dpias = await bulkInsert(sql, "data_protection_impact_assessments", dpiaCols, dpiaRows);

    // DSARs
    const DSAR_TYPES = ["access", "erasure", "rectification", "portability", "restriction", "objection"];
    const dsarRows = [];
    for (let i = 0; i < 14; i++) {
      const type = rng.pick(DSAR_TYPES);
      const open = rng.chance(0.35);
      const reqDate = agoDays(open ? rng.int(1, 20) : rng.int(30, 300));
      dsarRows.push({
        client_id: clientId,
        request_id: `DSAR-${String(i+1).padStart(4,'0')}`,
        request_type: type,
        status: open ? rng.pick(["received", "verifying", "in_progress"]) : rng.weighted([["completed", 80], ["rejected", 10], ["withdrawn", 10]]),
        subject_email: `data.subject${i}@example.org`,
        subject_name: rng.pick(["Max Mustermann", "Anna Beispiel", "Jan de Vries", "Claire Dupont", "Erik Johansson"]),
        verification_status: open ? "pending" : "verified",
        request_date: reqDate,
        due_date: new Date(reqDate.getTime() + 30 * 86400000),
        completed_date: open ? null : new Date(reqDate.getTime() + rng.int(5, 28) * 86400000),
        assignee_id: userIds[0],
        resolution_notes: open ? "Identity verification in progress; searching systems listed in ROPA." :
          "Response provided within statutory timeframe; actions documented and logged.",
        priority: rng.weighted([["normal", 70], ["high", 30]]),
        submission_method: rng.pick(["email", "web_form", "postal"]),
        audit_log: JSON.stringify({ trail: "full processing log retained per policy" }),
        created_at: reqDate,
        updated_at: agoDays(rng.int(0, 10)),
      });
    }
    out.dsars = await bulkInsert(sql, "dsar_requests",
      ["client_id","request_id","request_type","status","subject_email","subject_name","verification_status","request_date","due_date","completed_date","assignee_id","resolution_notes","priority","submission_method","audit_log","created_at","updated_at"], dsarRows);

    // Breaches (one notifiable incident)
    const brRows = [
      {
        client_id: clientId,
        description: "Misdirected shipment documents containing consignee personal data sent to wrong retail customer via batch job misconfiguration.",
        effects: "Confidentiality breach affecting approximately 240 data subjects; no special categories involved.",
        remedial_actions: "Batch job corrected; recipient confirmed deletion with signed attestation; supervisory authority notified within 72h; process control added.",
        date_occurred: agoDays(95),
        date_detected: agoDays(94),
        date_reported_to_dpa: agoDays(92),
        date_reported_to_data_subjects: null,
        status: "closed",
        is_notifiable_to_dpa: true,
        is_notifiable_to_subjects: false,
        created_by: userIds[0],
      },
      {
        client_id: clientId,
        description: "Phishing email led one employee to enter credentials on a spoofed O365 page; detected by conditional access anomaly rule.",
        effects: "Potential confidentiality impact; mailbox rules were created briefly before containment.",
        remedial_actions: "Password reset, session revocation, mailbox rule removal, awareness refresher assigned.",
        date_occurred: agoDays(20),
        date_detected: agoDays(20),
        date_reported_to_dpa: null,
        date_reported_to_data_subjects: null,
        status: "closed",
        is_notifiable_to_dpa: false,
        is_notifiable_to_subjects: false,
        created_by: userIds[0],
      },
    ];
    out.breaches = await bulkInsert(sql, "data_breaches",
      ["client_id","description","effects","remedial_actions","date_occurred","date_detected","date_reported_to_dpa","date_reported_to_data_subjects","status","is_notifiable_to_dpa","is_notifiable_to_subjects","created_by"], brRows);

    // International transfers
    const trRows = [
      { client_id: clientId, title: "Okta pilot — identity data to US", destination_country_code: "US", transfer_tool: "scc_2021", scc_module: "c2p", status: "active", next_review_date: daysFromNow(rng.int(60, 300)) },
      { client_id: clientId, title: "Zendesk support data — EU instance w/ US parent", destination_country_code: "US", transfer_tool: "scc_2021", scc_module: "c2p", status: "risk_flagged", next_review_date: daysFromNow(rng.int(5, 45)) },
      { client_id: clientId, title: "Shipment customs data to Swiss logistics partner", destination_country_code: "CH", transfer_tool: "adequacy", scc_module: null, status: "active", next_review_date: daysFromNow(rng.int(90, 300)) },
    ];
    out.transfers = await bulkInsert(sql, "international_transfers",
      ["client_id","title","destination_country_code","transfer_tool","scc_module","status","next_review_date"], trRows);
  }

  // ============ ACCESS REVIEWS ============
  const cycRow = {
    client_id: clientId,
    name: `Q${rng.int(1,4)} ${new Date().getFullYear()} Quarterly Access Review`,
    description: "Certification of user accounts across core systems: AD, Entra ID, GitLab, SAP, WMS.",
    due_date: daysFromNow(rng.int(-5, 25)),
    status: "active",
  };
  const [cycle] = await sql`INSERT INTO access_review_cycles ${sql(cycRow)} RETURNING id`;
  out.access_cycles = 1;
  // tasks
  const art = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='access_review_tasks' ORDER BY ordinal_position`;
  const artCols = art.map(r => r.column_name);
  if (artCols.length > 3) {
    const taskRows = [];
    const sysList = isEU ? ["Active Directory", "Entra ID", "GitLab", "SAP S/4HANA", "WMS", "SharePoint"]
                         : ["Enclave AD", "Azure AD GCC", "GitLab Gov", "Splunk", "Deltek", "VDI Broker"];
    for (const sys of sysList) {
      for (let i = 0; i < rng.int(3, 8); i++) {
        taskRows.push({
          client_id: clientId,
          cycle_id: cycle.id,
          user_id: userIds[0],
          role: `${sys} — ${rng.pick(["standard_user", "admin", "service_account", "read_only"])}`,
          status: rng.weighted([["pending", 30], ["certified", 50], ["revoked", 12], ["overdue", 8]]),
          note: rng.chance(0.3) ? "Access verified against current job responsibilities." : null,
        });
      }
    }
    const validCols = artCols.filter(c => c in taskRows[0]);
    try {
      out.access_tasks = await bulkInsert(sql, "access_review_tasks", validCols, taskRows);
    } catch (e) {
      log("access_review_tasks shape mismatch:", e.message.slice(0, 120));
    }
  }

  // ============ AI GOVERNANCE (Nordwind only) ============
  if (isEU) {
    const aiRows = [
      {
        client_id: clientId,
        name: "CargoTrack ETA Prediction Engine",
        description: "Gradient-boosted model predicting shipment ETAs from route, weather and historical transit data.",
        purpose: "Improve delivery time estimates shown to customers",
        intended_users: "Dispatchers; indirectly customers via portal",
        deployment_context: "Batch scoring in AWS eu-central-1; outputs displayed in TMS UI",
        type: "in_house_ml",
        risk_level: "low",
        status: "production",
        owner: empName(),
        data_sensitivity: "internal",
        eu_ai_act_class: "minimal",
        eu_ai_act_deployer: true,
        eu_ai_act_prohibited: false,
        eu_ai_act_last_assessment_date: agoDays(40),
        eu_ai_act_next_assessment_date: daysFromNow(320),
      },
      {
        client_id: clientId,
        name: "CV Screening Assistant (Personio plugin)",
        description: "LLM-based assistant summarizing applications for recruiters; human decision always required.",
        purpose: "Reduce recruiter screening workload",
        intended_users: "HR recruiters",
        deployment_context: "SaaS add-on; EU data residency confirmed",
        type: "saas_llm",
        risk_level: "medium",
        status: "evaluation",
        owner: empName(),
        data_sensitivity: "confidential",
        eu_ai_act_class: "high",
        eu_ai_act_high_risk_category: "employment_screening",
        eu_ai_act_deployer: true,
        eu_ai_act_conformity_assessment: "vendor declaration pending",
        eu_ai_act_prohibited: false,
        eu_ai_act_last_assessment_date: agoDays(10),
        eu_ai_act_next_assessment_date: daysFromNow(170),
      },
      {
        client_id: clientId,
        name: "Warehouse Vision Safety Monitoring",
        description: "Computer vision detecting forklift-pedestrian proximity violations; alerts only, no disciplinary use permitted by policy.",
        purpose: "Workplace safety",
        intended_users: "Site safety officers",
        deployment_context: "Edge devices in Hamburg warehouse",
        type: "computer_vision",
        risk_level: "high",
        status: "monitoring",
        owner: empName(),
        data_sensitivity: "confidential",
        eu_ai_act_class: "high",
        eu_ai_act_high_risk_category: "workplace_safety_monitoring",
        eu_ai_act_deployer: true,
        eu_ai_act_conformity_assessment: "internal conformity assessment done",
        eu_ai_act_prohibited: false,
        eu_ai_act_last_assessment_date: agoDays(80),
        eu_ai_act_next_assessment_date: daysFromNow(280),
      },
    ];
    out.ai_systems = await bulkInsert(sql, "ai_systems",
      ["client_id","name","description","purpose","intended_users","deployment_context","type","risk_level","status","owner","data_sensitivity","eu_ai_act_class","eu_ai_act_deployer","eu_ai_act_high_risk_category","eu_ai_act_conformity_assessment","eu_ai_act_prohibited","eu_ai_act_last_assessment_date","eu_ai_act_next_assessment_date"], aiRows);
  }

  // ============ AUDIT FINDINGS (internal audit) ============
  const FINDINGS = isEU ? [
    ["Quarterly backup restoration test skipped in Q2", "The scheduled restore test for WMS was deferred without documented exception approval.", "medium", "open"],
    ["Shared service account in EDI gateway", "Generic account used by integration vendor lacks individual attribution; violates A.5.18.", "high", "open"],
    ["Physical access log review gaps", "Two weeks of badge logs for Rotterdam site not reviewed per weekly schedule.", "low", "closed"],
    ["Outdated TLS config on legacy print server", "TLS 1.0 still accepted internally on print server; compensating segmentation verified.", "medium", "accepted"],
    ["SoA justification missing for A.8.26", "Exclusion justification incomplete for application security requirements control.", "medium", "open"],
  ] : [
    ["POA&M aging: AC-2(3) disposition overdue", "Inactive account disposition evidence older than POA&M milestone.", "high", "open"],
    ["Missing annual refresher for 3 cleared staff", "Role-based training completion gap identified in LMS reconciliation.", "medium", "open"],
    ["Enclave scan coverage gap — two assets", "Monthly authenticated scans missed two decommissioning-staged VMs.", "medium", "open"],
    ["Incident response plan tabletop not documented", "Q1 tabletop conducted but minutes not retained as evidence.", "low", "closed"],
    ["SSP section 13.2 revision not signed", "Latest SSP revision pending authorizing official signature.", "high", "open"],
  ];
  const afRows = FINDINGS.map(([title, description, severity, status]) => ({
    client_id: clientId,
    title,
    description,
    severity,
    status,
    author_id: userIds[0],
  }));
  out.audit_findings = await bulkInsert(sql, "audit_findings",
    ["client_id","title","description","severity","status","author_id"], afRows);

  log(`phase4:`, JSON.stringify(out));
  return out;
}
