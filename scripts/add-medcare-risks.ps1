Add-Type -AssemblyName System.Net.Http
$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(30)

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

$clientId = 9

$risks = @(
    @{
        clientId = $clientId
        title = "Ransomware Attack on Patient Management System"
        threatDescription = "Attackers deploy ransomware that encrypts the Electronic Health Records (EHR) system, disrupting clinical operations and potentially causing patient harm"
        likelihood = 4
        impact = 5
        category = "Cybersecurity"
        riskOwner = "CISO"
        treatmentOption = "mitigate"
        priority = "critical"
        existingControls = "Antivirus, email filtering, daily backups"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("EHR Database", "Patient Management System", "Clinical Workstations")
        recommendedActions = "Deploy EDR solution, implement network segmentation for clinical systems, conduct ransomware simulation exercise"
        assessor = "External Security Consultant"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Unauthorized Access to Patient Data via Compromised Credentials"
        threatDescription = "Phishing attack leads to compromised staff credentials, enabling unauthorized access to sensitive patient health information (PHI)"
        likelihood = 4
        impact = 4
        category = "Data Protection"
        riskOwner = "DPO"
        treatmentOption = "mitigate"
        priority = "high"
        existingControls = "Password policy, annual security awareness training, access logging"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("Patient Records", "Staff Accounts", "Email System")
        recommendedActions = "Enforce MFA for all users, implement privileged access management, deploy user behavior analytics"
        assessor = "Internal Audit"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Third-Party Vendor Data Breach"
        threatDescription = "A cloud-based medical imaging vendor suffers a breach, exposing patient diagnostic images and associated PII"
        likelihood = 3
        impact = 5
        category = "Supply Chain"
        riskOwner = "IT Director"
        treatmentOption = "transfer"
        priority = "high"
        existingControls = "Security clauses in vendor contracts, annual vendor assessments"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("Medical Imaging Archive", "Patient Demographics", "Diagnostic Reports")
        recommendedActions = "Require SOC 2 Type II reports from all vendors, implement data encryption at vendor, establish vendor incident notification SLA"
        assessor = "GRC Team"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Insider Threat - Data Exfiltration by Disgruntled Employee"
        threatDescription = "A terminated employee uses retained access to download patient records before leaving the organization"
        likelihood = 3
        impact = 5
        category = "Insider Threat"
        riskOwner = "HR Director"
        treatmentOption = "mitigate"
        priority = "high"
        existingControls = "Offboarding checklist, access revocation within 24 hours"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("HR Database", "Patient Records", "Email Archives")
        recommendedActions = "Implement DLP solution, deploy user activity monitoring, reduce access revocation SLA to 1 hour"
        assessor = "CISO"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Clinical System Outage During Patient Care"
        threatDescription = "Hardware failure at primary data centre causes extended outage of critical clinical systems during peak patient hours"
        likelihood = 3
        impact = 5
        category = "Availability"
        riskOwner = "IT Operations Manager"
        treatmentOption = "mitigate"
        priority = "critical"
        existingControls = "UPS, generator backup, daily backups"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("Patient Management System", "Pharmacy System", "Laboratory Information System")
        recommendedActions = "Implement active-active disaster recovery, migrate critical systems to cloud, validate RTO/RPO quarterly"
        assessor = "BC Manager"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Regulatory Non-Compliance Penalty"
        threatDescription = "Failure to meet evolving NHS Data Security and Protection Toolkit requirements results in regulatory fines and reputational damage"
        likelihood = 3
        impact = 4
        category = "Compliance"
        riskOwner = "Compliance Officer"
        treatmentOption = "mitigate"
        priority = "high"
        existingControls = "Compliance register, quarterly legal reviews, DSPT submission"
        controlEffectiveness = "effective"
        affectedAssets = @("Regulatory Standing", "Organisational Reputation", "Funding Eligibility")
        recommendedActions = "Hire dedicated compliance analyst, implement GRC automation platform, establish regulatory change monitoring"
        assessor = "External Auditor"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Legacy System Vulnerability Exploitation"
        threatDescription = "Unsupported Windows Server 2012 hosting legacy medical device interface is exploited, pivoting to clinical network"
        likelihood = 4
        impact = 4
        category = "Vulnerability Management"
        riskOwner = "IT Security Manager"
        treatmentOption = "mitigate"
        priority = "high"
        existingControls = "Network segmentation, vulnerability scanning, patching for supported systems"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("Legacy Medical Device Interface", "Clinical Network Segment", "Patient Monitoring Systems")
        recommendedActions = "Replace legacy systems, implement microsegmentation, deploy compensating controls for systems that cannot be patched"
        assessor = "Penetration Tester"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    }
)

Write-Host "Creating $($risks.Count) risk assessments for Client $clientId..."

$success = 0
$failed = 0

foreach ($risk in $risks) {
    $result = Invoke-TrpcPost -Path "risks.upsert" -Data $risk
    
    if ($result.Success) {
        $success++
        $response = $result.Body | ConvertFrom-Json
        Write-Host "Created: $($risk.Title) (ID: $($response.result.data.json.id))" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "FAILED: $($risk.Title) - $($result.Body.Substring(0, [Math]::Min(100, $result.Body.Length)))" -ForegroundColor Red
    }
}

Write-Host "`nDone! Success: $success, Failed: $failed"
