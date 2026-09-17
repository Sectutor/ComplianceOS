# Case Study 9: Federal Digital Services Agency (FDSA) - FedRAMP/NIST CSF
# Client ID: 15
# Frameworks: NIST CSF (247 controls) + ISO 27001 (95 controls)

Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(60)

function Invoke-TrpcPost {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $url = $baseUri + "/" + $Path + "?batch=1"
    $content = New-Object System.Net.Http.StringContent($batchInput, [System.Text.Encoding]::UTF8, "application/json")
    $resp = $hc.PostAsync($url, $content).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    return @{ Status = $resp.StatusCode; Body = $body; Success = $resp.IsSuccessStatusCode }
}

function Invoke-TrpcGet {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $encoded = [System.Web.HttpUtility]::UrlEncode($jsonData)
    $url = $baseUri + "/" + $Path + "?input=" + $encoded
    $resp = $hc.GetAsync($url).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    return @{ Status = $resp.StatusCode; Body = $body; Success = $resp.IsSuccessStatusCode }
}

$clientId = 15
$successCount = 0
$failCount = 0

function Add-GapResponse {
    param($AssessmentId, $ControlId, $CurrentStatus, $TargetStatus, $Notes)
    $result = Invoke-TrpcPost "gapAnalysis.updateResponse" @{
        assessmentId = $AssessmentId
        controlId = $ControlId
        currentStatus = $CurrentStatus
        targetStatus = $TargetStatus
        notes = $Notes
    }
    if ($result.Success) { $script:successCount++ } else { $script:failCount++; Write-Host "FAIL: $ControlId - $Notes" }
}

Write-Host "=== CASE STUDY 9: FEDERAL DIGITAL SERVICES AGENCY (FDSA) ===" -ForegroundColor Cyan
Write-Host "Client ID: $clientId" -ForegroundColor Yellow

# ============================================
# STEP 1: Create Gap Analysis for NIST CSF
# ============================================
Write-Host "`n--- Step 1: Creating NIST CSF Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "FDSA NIST CSF Gap Analysis - FedRAMP Readiness"
    framework = "NIST CSF"
    scope = "All federal IT systems, cloud infrastructure (FedRAMP authorized), citizen data processing systems, inter-agency communication networks, and supporting organizational processes"
}
Write-Host "NIST CSF Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$nistGapId = 6  # Expected ID

# ============================================
# STEP 2: Create Gap Analysis for ISO 27001
# ============================================
Write-Host "`n--- Step 2: Creating ISO 27001 Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "FDSA ISO 27001 Gap Analysis - ISMS Implementation"
    framework = "ISO 27001"
    scope = "All federal digital services, citizen data processing, cloud infrastructure, internal IT systems, and third-party service integrations"
}
Write-Host "ISO 27001 Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$isoGapId = 7  # Expected ID

# ============================================
# STEP 3: Add NIST CSF Gap Responses (sample of key controls)
# ============================================
Write-Host "`n--- Step 3: Adding NIST CSF Gap Responses ---" -ForegroundColor Green

# GOVERN category controls
$nistGovernControls = @(
    @{Id="ID.AM-01"; Current="partially_implemented"; Target="implemented"; Notes="Asset inventory exists but not fully automated for federal systems"},
    @{Id="ID.AM-02"; Current="partially_implemented"; Target="implemented"; Notes="Software inventory incomplete for legacy federal applications"},
    @{Id="ID.AM-03"; Current="implemented"; Target="implemented"; Notes="Data inventory established per federal data strategy"},
    @{Id="ID.BE-01"; Current="implemented"; Target="implemented"; Notes="Mission and objectives clearly defined per federal mandate"},
    @{Id="ID.BE-02"; Current="partially_implemented"; Target="implemented"; Notes="Risk management roles defined but need clearer federal accountability"},
    @{Id="ID.BE-03"; Current="implemented"; Target="implemented"; Notes="Legal and regulatory requirements documented"},
    @{Id="ID.GV-01"; Current="implemented"; Target="implemented"; Notes="Cybersecurity strategy aligned with federal requirements"},
    @{Id="ID.GV-02"; Current="partially_implemented"; Target="implemented"; Notes="Cybersecurity roles defined but need CISO appointment"},
    @{Id="ID.GV-03"; Current="implemented"; Target="implemented"; Notes="Governance processes established per federal standards"},
    @{Id="ID.RA-01"; Current="partially_implemented"; Target="implemented"; Notes="Risk assessment methodology needs FedRAMP alignment"},
    @{Id="ID.RA-02"; Current="not_implemented"; Target="implemented"; Notes="Threat intelligence program not yet established"},
    @{Id="ID.RA-03"; Current="partially_implemented"; Target="implemented"; Notes="Risk register exists but needs FedRAMP-specific risks"},
    @{Id="ID.RM-01"; Current="implemented"; Target="implemented"; Notes="Risk management strategy documented"},
    @{Id="ID.RM-02"; Current="partially_implemented"; Target="implemented"; Notes="Risk appetite statement needs federal approval"},
    @{Id="ID.SC-01"; Current="partially_implemented"; Target="implemented"; Notes="Supply chain risk management needs FedRAMP supplier assessment"}
)

foreach ($ctrl in $nistGovernControls) {
    Add-GapResponse -AssessmentId $nistGapId -ControlId $ctrl.Id -CurrentStatus $ctrl.Current -TargetStatus $ctrl.Target -Notes $ctrl.Notes
}

# PROTECT category controls
$nistProtectControls = @(
    @{Id="PR.AC-01"; Current="implemented"; Target="implemented"; Notes="Identity management system deployed with PIV/CAC"},
    @{Id="PR.AC-02"; Current="partially_implemented"; Target="implemented"; Notes="Remote access needs stronger MFA for federal systems"},
    @{Id="PR.AC-03"; Current="implemented"; Target="implemented"; Notes="Access controls implemented per federal standards"},
    @{Id="PR.AC-04"; Current="partially_implemented"; Target="implemented"; Notes="Separation of duties needs formal documentation"},
    @{Id="PR.AC-05"; Current="implemented"; Target="implemented"; Notes="Least privilege enforced across federal systems"},
    @{Id="PR.AT-01"; Current="implemented"; Target="implemented"; Notes="Security awareness training mandatory for all staff"},
    @{Id="PR.AT-02"; Current="partially_implemented"; Target="implemented"; Notes="Role-based training needs FedRAMP-specific modules"},
    @{Id="PR.DS-01"; Current="implemented"; Target="implemented"; Notes="Data-at-rest encryption using FIPS 140-2 validated modules"},
    @{Id="PR.DS-02"; Current="partially_implemented"; Target="implemented"; Notes="Data-in-transit encryption needs TLS 1.3 upgrade"},
    @{Id="PR.DS-03"; Current="implemented"; Target="implemented"; Notes="Asset destruction procedures per NIST 800-88"},
    @{Id="PR.DS-04"; Current="partially_implemented"; Target="implemented"; Notes="Processing integrity monitoring needs enhancement"},
    @{Id="PR.DS-05"; Current="implemented"; Target="implemented"; Notes="Backup and recovery tested quarterly"},
    @{Id="PR.IP-01"; Current="implemented"; Target="implemented"; Notes="Baseline configurations per DISA STIGs"},
    @{Id="PR.IP-02"; Current="partially_implemented"; Target="implemented"; Notes="System development lifecycle needs security integration"},
    @{Id="PR.IP-03"; Current="implemented"; Target="implemented"; Notes="Change control board established"},
    @{Id="PR.IP-04"; Current="partially_implemented"; Target="implemented"; Notes="Configuration management needs automation"},
    @{Id="PR.IP-05"; Current="implemented"; Target="implemented"; Notes="Vulnerability scanning weekly per federal requirements"},
    @{Id="PR.IP-06"; Current="partially_implemented"; Target="implemented"; Notes="Incident response plan needs FedRAMP-specific procedures"},
    @{Id="PR.MA-01"; Current="implemented"; Target="implemented"; Notes="Maintenance logs maintained per federal standards"},
    @{Id="PR.MA-02"; Current="partially_implemented"; Target="implemented"; Notes="Remote maintenance needs enhanced monitoring"},
    @{Id="PR.PT-01"; Current="implemented"; Target="implemented"; Notes="Audit logs retained per federal requirements"},
    @{Id="PR.PT-02"; Current="partially_implemented"; Target="implemented"; Notes="Removable media policies need enforcement"},
    @{Id="PR.PT-03"; Current="implemented"; Target="implemented"; Notes="Principle of least functionality enforced"},
    @{Id="PR.PT-04"; Current="partially_implemented"; Target="implemented"; Notes="Communications controls need network segmentation"},
    @{Id="PR.PT-05"; Current="implemented"; Target="implemented"; Notes="Mechanisms for integrity protection implemented"}
)

foreach ($ctrl in $nistProtectControls) {
    Add-GapResponse -AssessmentId $nistGapId -ControlId $ctrl.Id -CurrentStatus $ctrl.Current -TargetStatus $ctrl.Target -Notes $ctrl.Notes
}

# DETECT category controls
$nistDetectControls = @(
    @{Id="DE.AE-01"; Current="partially_implemented"; Target="implemented"; Notes="Network baseline established but needs automation"},
    @{Id="DE.AE-02"; Current="implemented"; Target="implemented"; Notes="Security event alerting configured"},
    @{Id="DE.AE-03"; Current="partially_implemented"; Target="implemented"; Notes="Event correlation needs SIEM enhancement"},
    @{Id="DE.AE-04"; Current="implemented"; Target="implemented"; Notes="Incident alert thresholds defined"},
    @{Id="DE.AE-05"; Current="partially_implemented"; Target="implemented"; Notes="Alert escalation needs federal notification procedures"},
    @{Id="DE.CM-01"; Current="implemented"; Target="implemented"; Notes="Network monitoring with federal SOC integration"},
    @{Id="DE.CM-02"; Current="partially_implemented"; Target="implemented"; Notes="Host monitoring needs endpoint detection"},
    @{Id="DE.CM-03"; Current="implemented"; Target="implemented"; Notes="Personnel activity monitoring for privileged users"},
    @{Id="DE.CM-04"; Current="partially_implemented"; Target="implemented"; Notes="Mobile code restrictions need enforcement"},
    @{Id="DE.CM-05"; Current="implemented"; Target="implemented"; Notes="External connections monitored"},
    @{Id="DE.CM-06"; Current="partially_implemented"; Target="implemented"; Notes="Vulnerability scanning needs continuous monitoring"},
    @{Id="DE.CM-07"; Current="implemented"; Target="implemented"; Notes="Unauthorized code detection implemented"},
    @{Id="DE.DP-01"; Current="partially_implemented"; Target="implemented"; Notes="Detection procedures need federal-specific use cases"},
    @{Id="DE.DP-02"; Current="implemented"; Target="implemented"; Notes="Detection events documented"},
    @{Id="DE.DP-03"; Current="partially_implemented"; Target="implemented"; Notes="Detection information needs federal sharing protocols"},
    @{Id="DE.DP-04"; Current="implemented"; Target="implemented"; Notes="Detection systems tested annually"},
    @{Id="DE.DP-05"; Current="partially_implemented"; Target="implemented"; Notes="Event detection information needs federal reporting"}
)

foreach ($ctrl in $nistDetectControls) {
    Add-GapResponse -AssessmentId $nistGapId -ControlId $ctrl.Id -CurrentStatus $ctrl.Current -TargetStatus $ctrl.Target -Notes $ctrl.Notes
}

# RESPOND category controls
$nistRespondControls = @(
    @{Id="RS.RP-01"; Current="implemented"; Target="implemented"; Notes="Incident response plan per federal standards"},
    @{Id="RS.RP-02"; Current="partially_implemented"; Target="implemented"; Notes="Resource allocation needs federal budget approval"},
    @{Id="RS.CO-01"; Current="implemented"; Target="implemented"; Notes="Personnel roles for incident response defined"},
    @{Id="RS.CO-02"; Current="partially_implemented"; Target="implemented"; Notes="Incident reporting needs federal timeline compliance"},
    @{Id="RS.CO-03"; Current="implemented"; Target="implemented"; Notes="Information sharing with federal partners established"},
    @{Id="RS.CO-04"; Current="partially_implemented"; Target="implemented"; Notes="Coordination with federal stakeholders needs formalization"},
    @{Id="RS.AN-01"; Current="implemented"; Target="implemented"; Notes="Incidents analyzed per federal procedures"},
    @{Id="RS.AN-02"; Current="partially_implemented"; Target="implemented"; Notes="Incident categorization needs federal impact levels"},
    @{Id="RS.AN-03"; Current="implemented"; Target="implemented"; Notes="Evidence collection per federal forensics standards"},
    @{Id="RS.MI-01"; Current="partially_implemented"; Target="implemented"; Notes="Incident containment needs federal system isolation procedures"},
    @{Id="RS.MI-02"; Current="implemented"; Target="implemented"; Notes="Mitigation activities documented"},
    @{Id="RS.IM-01"; Current="partially_implemented"; Target="implemented"; Notes="Incident lessons learned need federal knowledge base"},
    @{Id="RS.IM-02"; Current="implemented"; Target="implemented"; Notes="Response plan updated after incidents"}
)

foreach ($ctrl in $nistRespondControls) {
    Add-GapResponse -AssessmentId $nistGapId -ControlId $ctrl.Id -CurrentStatus $ctrl.Current -TargetStatus $ctrl.Target -Notes $ctrl.Notes
}

# RECOVER category controls
$nistRecoverControls = @(
    @{Id="RC.RP-01"; Current="implemented"; Target="implemented"; Notes="Recovery plan per federal continuity requirements"},
    @{Id="RC.RP-02"; Current="partially_implemented"; Target="implemented"; Notes="Recovery execution needs federal coordination"},
    @{Id="RC.CO-01"; Current="implemented"; Target="implemented"; Notes="Recovery communication procedures established"},
    @{Id="RC.CO-02"; Current="partially_implemented"; Target="implemented"; Notes="Recovery status reporting needs federal stakeholders"},
    @{Id="RC.CO-03"; Current="implemented"; Target="implemented"; Notes="Public relations for federal incidents defined"},
    @{Id="RC.IM-01"; Current="partially_implemented"; Target="implemented"; Notes="Recovery improvements need federal lessons learned"},
    @{Id="RC.IM-02"; Current="implemented"; Target="implemented"; Notes="Recovery plan updated after exercises"}
)

foreach ($ctrl in $nistRecoverControls) {
    Add-GapResponse -AssessmentId $nistGapId -ControlId $ctrl.Id -CurrentStatus $ctrl.Current -TargetStatus $ctrl.Target -Notes $ctrl.Notes
}

Write-Host "NIST CSF Gap Responses: $successCount success, $failCount failed"

# ============================================
# STEP 4: Add ISO 27001 Gap Responses (sample)
# ============================================
Write-Host "`n--- Step 4: Adding ISO 27001 Gap Responses ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$isoControls = @(
    @{Id="A.5.1"; Current="implemented"; Target="implemented"; Notes="Information security policies documented"},
    @{Id="A.5.2"; Current="implemented"; Target="implemented"; Notes="Management responsibilities assigned"},
    @{Id="A.5.3"; Current="partially_implemented"; Target="implemented"; Notes="Organizational roles need clearer definition"},
    @{Id="A.5.4"; Current="implemented"; Target="implemented"; Notes="Management responsibility established"},
    @{Id="A.5.5"; Current="partially_implemented"; Target="implemented"; Notes="Contact with authorities needs formalization"},
    @{Id="A.5.6"; Current="implemented"; Target="implemented"; Notes="Contact with special interest groups established"},
    @{Id="A.5.7"; Current="partially_implemented"; Target="implemented"; Notes="Threat intelligence needs federal integration"},
    @{Id="A.5.8"; Current="implemented"; Target="implemented"; Notes="Security in project management established"},
    @{Id="A.5.9"; Current="partially_implemented"; Target="implemented"; Notes="Inventory of assets needs automation"},
    @{Id="A.5.10"; Current="implemented"; Target="implemented"; Notes="Acceptable use of assets documented"},
    @{Id="A.5.11"; Current="implemented"; Target="implemented"; Notes="Return of assets procedure established"},
    @{Id="A.5.12"; Current="partially_implemented"; Target="implemented"; Notes="Classification of information needs federal labels"},
    @{Id="A.5.13"; Current="implemented"; Target="implemented"; Notes="Labeling of information per federal standards"},
    @{Id="A.5.14"; Current="partially_implemented"; Target="implemented"; Notes="Information transfer needs federal protocols"},
    @{Id="A.5.15"; Current="implemented"; Target="implemented"; Notes="Access control policy documented"},
    @{Id="A.5.16"; Current="partially_implemented"; Target="implemented"; Notes="Identity management needs PIV integration"},
    @{Id="A.5.17"; Current="implemented"; Target="implemented"; Notes="Authentication information management established"},
    @{Id="A.5.18"; Current="partially_implemented"; Target="implemented"; Notes="Access rights review needs automation"},
    @{Id="A.5.19"; Current="implemented"; Target="implemented"; Notes="Supplier relationships security established"},
    @{Id="A.5.20"; Current="partially_implemented"; Target="implemented"; Notes="Supplier agreements need FedRAMP clauses"},
    @{Id="A.5.21"; Current="implemented"; Target="implemented"; Notes="Supplier monitoring established"},
    @{Id="A.5.22"; Current="partially_implemented"; Target="implemented"; Notes="Change management needs federal approval"},
    @{Id="A.5.23"; Current="implemented"; Target="implemented"; Notes="Cloud service security established"},
    @{Id="A.5.24"; Current="partially_implemented"; Target="implemented"; Notes="Incident management needs federal procedures"},
    @{Id="A.5.25"; Current="implemented"; Target="implemented"; Notes="Assessment decisions documented"},
    @{Id="A.5.26"; Current="partially_implemented"; Target="implemented"; Notes="Incident response plan needs federal integration"},
    @{Id="A.5.27"; Current="implemented"; Target="implemented"; Notes="Evidence collection procedures established"},
    @{Id="A.5.28"; Current="partially_implemented"; Target="implemented"; Notes="Business continuity integration needed"}
)

foreach ($ctrl in $isoControls) {
    Add-GapResponse -AssessmentId $isoGapId -ControlId $ctrl.Id -CurrentStatus $ctrl.Current -TargetStatus $ctrl.Target -Notes $ctrl.Notes
}

Write-Host "ISO 27001 Gap Responses: $successCount success, $failCount failed"

# ============================================
# STEP 5: Calculate Priorities
# ============================================
Write-Host "`n--- Step 5: Calculating Priorities ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = $nistGapId }
Write-Host "NIST CSF Priorities: $($result.Body.Substring(0, [Math]::Min(100, $result.Body.Length)))"
$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = $isoGapId }
Write-Host "ISO 27001 Priorities: $($result.Body.Substring(0, [Math]::Min(100, $result.Body.Length)))"

# ============================================
# STEP 6: Create Risk Assessments
# ============================================
Write-Host "`n--- Step 6: Creating Risk Assessments ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalRisks = @(
    @{Title="Nation-state cyber attack on federal systems"; Category="Cybersecurity"; Likelihood=3; Impact=5; Treatment="mitigate"; Notes="Advanced persistent threat targeting federal data"},
    @{Title="FedRAMP authorization failure"; Category="Compliance"; Likelihood=2; Impact=5; Treatment="mitigate"; Notes="Risk of losing cloud service authorization"},
    @{Title="Insider threat from privileged user"; Category="Insider Threat"; Likelihood=3; Impact=4; Treatment="mitigate"; Notes="Federal employee with elevated access"},
    @{Title="Supply chain compromise via federal vendor"; Category="Supply Chain"; Likelihood=3; Impact=5; Treatment="transfer"; Notes="Third-party vendor with federal system access"},
    @{Title="Ransomware attack on citizen services"; Category="Cybersecurity"; Likelihood=4; Impact=5; Treatment="mitigate"; Notes="Critical citizen-facing systems at risk"},
    @{Title="Data breach of PII records"; Category="Data Protection"; Likelihood=3; Impact=5; Treatment="mitigate"; Notes="Citizen personal information exposure"},
    @{Title="Legacy system vulnerability exploitation"; Category="Vulnerability"; Likelihood=4; Impact=4; Treatment="mitigate"; Notes="Outdated federal IT infrastructure"},
    @{Title="Inter-agency data sharing breach"; Category="Data Protection"; Likelihood=2; Impact=4; Treatment="mitigate"; Notes="Cross-agency information exchange risk"},
    @{Title="Cloud service provider outage"; Category="Availability"; Likelihood=3; Impact=5; Treatment="transfer"; Notes="FedRAMP-authorized CSP downtime"},
    @{Title="Non-compliance with FISMA requirements"; Category="Compliance"; Likelihood=2; Impact=4; Treatment="mitigate"; Notes="Federal Information Security Modernization Act violation"}
)

foreach ($risk in $federalRisks) {
    $result = Invoke-TrpcPost "risks.upsert" @{
        clientId = $clientId
        title = $risk.Title
        category = $risk.Category
        likelihood = $risk.Likelihood
        impact = $risk.Impact
        treatmentOption = $risk.Treatment
        notes = $risk.Notes
        status = "open"
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($risk.Title)" }
}

Write-Host "Risk Assessments: $successCount success, $failCount failed"

# ============================================
# STEP 7: Create Policies
# ============================================
Write-Host "`n--- Step 7: Creating Federal Policies ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalPolicies = @(
    @{Name="Federal Information Security Policy"; Module="general"; Status="approved"; Notes="Comprehensive security policy per FISMA requirements"},
    @{Name="FedRAMP Security Assessment Policy"; Module="general"; Status="approved"; Notes="Cloud security assessment procedures"},
    @{Name="Federal Access Control Policy"; Module="general"; Status="approved"; Notes="PIV/CAC authentication requirements"},
    @{Name="Federal Incident Response Policy"; Module="cyber"; Status="approved"; Notes="Incident handling per federal standards"},
    @{Name="Federal Business Continuity Policy"; Module="general"; Status="approved"; Notes="Continuity of operations planning"},
    @{Name="Federal Data Classification Policy"; Module="general"; Status="approved"; Notes="Data classification per federal standards"},
    @{Name="Federal Supplier Risk Management Policy"; Module="general"; Status="approved"; Notes="Third-party risk for federal vendors"},
    @{Name="Federal Cryptography Policy"; Module="cyber"; Status="approved"; Notes="FIPS 140-2/140-3 compliance requirements"},
    @{Name="Federal Personnel Security Policy"; Module="general"; Status="approved"; Notes="Background checks and security clearances"},
    @{Name="Federal Physical Security Policy"; Module="general"; Status="approved"; Notes="Federal facility security requirements"},
    @{Name="Federal System Development Security Policy"; Module="cyber"; Status="approved"; Notes="Secure development for federal systems"},
    @{Name="Federal Network Security Policy"; Module="cyber"; Status="approved"; Notes="Network segmentation and monitoring"},
    @{Name="Federal Privacy Policy"; Module="privacy"; Status="approved"; Notes="Privacy Act compliance"},
    @{Name="Federal Records Management Policy"; Module="general"; Status="approved"; Notes="NARA records retention requirements"},
    @{Name="Federal Continuous Monitoring Policy"; Module="cyber"; Status="approved"; Notes="Ongoing security monitoring procedures"}
)

foreach ($policy in $federalPolicies) {
    $result = Invoke-TrpcPost "clientPolicies.create" @{
        clientId = $clientId
        name = $policy.Name
        module = $policy.Module
        status = $policy.Status
        notes = $policy.Notes
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($policy.Name)" }
}

Write-Host "Policies: $successCount success, $failCount failed"

# ============================================
# STEP 8: Create BCP Project
# ============================================
Write-Host "`n--- Step 8: Creating Business Continuity Plan ---" -ForegroundColor Green
$result = Invoke-TrpcPost "businessContinuity.program.upsert" @{
    clientId = $clientId
    programName = "FDSA Federal Continuity Program"
    scopeDescription = "All federal citizen services, inter-agency systems, cloud infrastructure"
    policyStatement = "FDSA maintains critical federal services during disruptive incidents per FCD 1 and NSPD-51"
    budgetAllocated = "500000"
    status = "active"
}
Write-Host "BCP Program: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"

# ============================================
# STEP 9: Create Business Processes
# ============================================
Write-Host "`n--- Step 9: Creating Business Processes ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalProcesses = @(
    @{Name="Citizen Identity Verification"; Department="Digital Services"; Criticality="Critical"; RTO="1 hour"; RPO="0 minutes"},
    @{Name="Federal Benefits Processing"; Department="Benefits Administration"; Criticality="Critical"; RTO="30 minutes"; RPO="0 minutes"},
    @{Name="Tax Filing Services"; Department="Revenue Services"; Criticality="Critical"; RTO="1 hour"; RPO="15 minutes"},
    @{Name="Healthcare Enrollment"; Department="Health Services"; Criticality="Critical"; RTO="2 hours"; RPO="0 minutes"},
    @{Name="Immigration Case Management"; Department="Immigration Services"; Criticality="High"; RTO="4 hours"; RPO="1 hour"},
    @{Name="Federal Payment Processing"; Department="Financial Services"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="Inter-agency Data Exchange"; Department="IT Operations"; Criticality="High"; RTO="2 hours"; RPO="30 minutes"},
    @{Name="Public Website Services"; Department="Communications"; Criticality="High"; RTO="1 hour"; RPO="1 hour"}
)

foreach ($proc in $federalProcesses) {
    $result = Invoke-TrpcPost "businessContinuity.processes.create" @{
        clientId = $clientId
        name = $proc.Name
        department = $proc.Department
        criticalityTier = $proc.Criticality
        rto = $proc.RTO
        rpo = $proc.RPO
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($proc.Name)" }
}

Write-Host "Business Processes: $successCount success, $failCount failed"

# ============================================
# STEP 10: Create Vendors
# ============================================
Write-Host "`n--- Step 10: Creating Federal Vendors ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalVendors = @(
    @{Name="CloudGov Solutions"; Category="FedRAMP Cloud IaaS"; Criticality="Critical"; DataAccess="PII"},
    @{Name="SecureAuth Federal"; Category="Identity Management"; Criticality="Critical"; DataAccess="PII"},
    @{Name="FedData Analytics"; Category="Data Analytics"; Criticality="High"; DataAccess="PII"},
    @{Name="CyberDefense Federal"; Category="Security Operations"; Criticality="Critical"; DataAccess="Sensitive"},
    @{Name="NetFederal Communications"; Category="Network Services"; Criticality="High"; DataAccess="Sensitive"},
    @{Name="AppDev Federal"; Category="Application Development"; Criticality="Medium"; DataAccess="Internal"},
    @{Name="TrainFederal Security"; Category="Security Training"; Criticality="Low"; DataAccess="None"},
    @{Name="AuditFederal Services"; Category="Compliance Audit"; Criticality="High"; DataAccess="Sensitive"}
)

foreach ($vendor in $federalVendors) {
    $result = Invoke-TrpcPost "vendorAssessments.createVendor" @{
        clientId = $clientId
        name = $vendor.Name
        category = $vendor.Category
        criticality = $vendor.Criticality
        dataAccess = $vendor.DataAccess
        status = "Active"
        reviewStatus = "active"
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($vendor.Name)" }
}

Write-Host "Vendors: $successCount success, $failCount failed"

# ============================================
# STEP 11: Schedule Audit
# ============================================
Write-Host "`n--- Step 11: Scheduling Federal Audit ---" -ForegroundColor Green
$result = Invoke-TrpcPost "audit.scheduleAudit" @{
    clientId = $clientId
    frameworkId = 1
    title = "FISMA Annual Security Audit"
    type = "Federal"
    plannedDate = "2026-11-01"
    scope = "Annual Federal Information Security Modernization Act compliance audit"
    auditorEmail = "audit@ig.gov"
    auditorName = "Inspector General"
}
Write-Host "Audit: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"

Write-Host "`n=== FDSA FEDERAL CASE STUDY COMPLETE ===" -ForegroundColor Cyan
