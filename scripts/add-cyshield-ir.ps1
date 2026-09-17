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

$clientId = 13

Write-Host "=== Case Study 7: CyberShield IR Implementation ===" -ForegroundColor Cyan

# Step 1: Create IR-focused Gap Analysis
Write-Host "`nStep 1: Creating Incident Response Gap Analysis..." -ForegroundColor Yellow
$gapResult = Invoke-TrpcPost -Path "gapAnalysis.create" -Data @{
    clientId = $clientId
    name = "CyberShield Incident Response Capability Assessment"
    framework = "ISO 27001"
    scope = "SOC operations, incident response procedures, threat intelligence, forensic capabilities"
}
$gapId = ($gapResult.Body | ConvertFrom-Json).result.data.json.id
Write-Host "Gap Analysis created: ID $gapId" -ForegroundColor Green

# Step 2: Add IR-specific gap responses
Write-Host "`nStep 2: Adding IR Gap Responses..." -ForegroundColor Yellow
$irControls = @(
    @{ ControlId = "A.5.24"; Status = "implemented"; Notes = "IR plan documented and tested quarterly" },
    @{ ControlId = "A.5.25"; Status = "implemented"; Notes = "Automated event classification with SIEM" },
    @{ ControlId = "A.5.26"; Status = "implemented"; Notes = "Dedicated CSIRT with 24/7 on-call rotation" },
    @{ ControlId = "A.5.27"; Status = "partially_implemented"; Notes = "Post-incident reviews conducted, knowledge base growing" },
    @{ ControlId = "A.5.28"; Status = "implemented"; Notes = "Forensic workstations and chain-of-custody procedures" },
    @{ ControlId = "A.8.15"; Status = "implemented"; Notes = "Centralised SIEM with 12-month retention" },
    @{ ControlId = "A.8.16"; Status = "implemented"; Notes = "24/7 SOC monitoring with automated alerting" },
    @{ ControlId = "A.5.7"; Status = "implemented"; Notes = "Commercial threat intelligence feeds integrated" }
)

foreach ($ctrl in $irControls) {
    $result = Invoke-TrpcPost -Path "gapAnalysis.updateResponse" -Data @{
        assessmentId = $gapId
        controlId = $ctrl.ControlId
        currentStatus = $ctrl.Status
        targetStatus = "implemented"
        notes = $ctrl.Notes
    }
    Write-Host "  Added: $($ctrl.ControlId) - $($ctrl.Status)" -ForegroundColor Green
}

# Step 3: Create IR Risk Assessments
Write-Host "`nStep 3: Creating IR Risk Assessments..." -ForegroundColor Yellow
$irRisks = @(
    @{
        clientId = $clientId
        title = "Advanced Persistent Threat (APT) Targeting Client Data"
        threatDescription = "Nation-state actor targets CyberShield's managed security clients for data exfiltration"
        likelihood = 3
        impact = 5
        category = "Cybersecurity"
        riskOwner = "CISO"
        treatmentOption = "mitigate"
        priority = "critical"
        existingControls = "SIEM, EDR, threat intelligence, 24/7 SOC"
        controlEffectiveness = "effective"
        affectedAssets = @("SOC Platform", "Client Data", "Threat Intelligence Feeds")
        recommendedActions = "Deploy deception technology, enhance threat hunting program, implement zero trust architecture"
        assessor = "Security Director"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Ransomware Attack on Internal Systems"
        threatDescription = "Ransomware deployed via phishing encrypts internal systems and client dashboards"
        likelihood = 4
        impact = 4
        category = "Cybersecurity"
        riskOwner = "SOC Manager"
        treatmentOption = "mitigate"
        priority = "high"
        existingControls = "Email filtering, EDR, backups, incident response plan"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("Internal Systems", "Client Dashboards", "Email System")
        recommendedActions = "Implement application whitelisting, enhance email security, deploy network segmentation"
        assessor = "IR Team Lead"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    },
    @{
        clientId = $clientId
        title = "Insider Threat - Malicious Administrator"
        threatDescription = "Privileged insider abuses access to client environments for financial gain"
        likelihood = 2
        impact = 5
        category = "Insider Threat"
        riskOwner = "HR Director"
        treatmentOption = "mitigate"
        priority = "high"
        existingControls = "Background checks, access logging, separation of duties"
        controlEffectiveness = "partially_effective"
        affectedAssets = @("Client Environments", "Administrative Access", "Audit Logs")
        recommendedActions = "Implement PAM solution, deploy user behavior analytics, enhance vetting procedures"
        assessor = "CISO"
        method = "ISO 27005"
        assessmentDate = "2026-08-16"
    }
)

foreach ($risk in $irRisks) {
    $result = Invoke-TrpcPost -Path "risks.upsert" -Data $risk
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    Write-Host "  Created: $($risk.title) (ID: $id)" -ForegroundColor Green
}

# Step 4: Create IR Policies
Write-Host "`nStep 4: Creating IR Policies..." -ForegroundColor Yellow
$irPolicies = @(
    @{
        clientId = $clientId
        name = "Incident Response Plan"
        content = "# Incident Response Plan\n\n## 1. Purpose\nDefine procedures for detecting, responding to, and recovering from security incidents.\n\n## 2. Incident Classification\n- P1 Critical: Active breach, data exfiltration, ransomware\n- P2 High: Confirmed compromise, malware outbreak\n- P3 Medium: Suspicious activity, policy violation\n- P4 Low: Minor event, false positive\n\n## 3. Response Procedures\n- Detection: SIEM alerts, user reports, threat intelligence\n- Analysis: Triage within 15 minutes for P1/P2\n- Containment: Isolate affected systems within 1 hour\n- Eradication: Remove threat, patch vulnerabilities\n- Recovery: Restore from known-good backups\n- Lessons Learned: Post-incident review within 5 days"
        status = "approved"
        owner = "CISO"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Security Monitoring Procedures"
        content = "# Security Monitoring Procedures\n\n## 1. SOC Operations\n- 24/7 monitoring by trained analysts\n- Three shifts with handover procedures\n- Escalation matrix documented\n\n## 2. Alert Triage\n- Initial triage within 15 minutes\n- Classification using severity matrix\n- Assignment to appropriate team\n\n## 3. Threat Hunting\n- Weekly proactive hunts\n- Hypothesis-driven investigations\n- Threat intelligence integration"
        status = "approved"
        owner = "SOC Manager"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Digital Forensics Procedures"
        content = "# Digital Forensics Procedures\n\n## 1. Evidence Collection\n- Forensic workstations prepared and verified\n- Write blockers for disk imaging\n- Chain of custody documentation\n\n## 2. Analysis\n- Memory analysis for live systems\n- Disk forensics using approved tools\n- Timeline reconstruction\n\n## 3. Reporting\n- Findings documented in standard format\n- Legal review before distribution\n- Retention per policy requirements"
        status = "approved"
        owner = "IR Team Lead"
        module = "cyber"
    }
)

foreach ($policy in $irPolicies) {
    $result = Invoke-TrpcPost -Path "clientPolicies.create" -Data $policy
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    Write-Host "  Created: $($policy.name) (ID: $id)" -ForegroundColor Green
}

Write-Host "`n=== Case Study 7 Complete ===" -ForegroundColor Cyan
