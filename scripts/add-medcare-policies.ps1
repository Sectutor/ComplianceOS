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

$policies = @(
    @{
        clientId = $clientId
        name = "Information Security Policy"
        content = "# Information Security Policy\n\n## 1. Purpose\nThis policy establishes the framework for protecting MedCare's information assets.\n\n## 2. Scope\nApplies to all employees, contractors, and third parties accessing MedCare systems.\n\n## 3. Policy\n- All information assets shall be classified and handled according to their sensitivity\n- Access shall be granted on a need-to-know basis\n- Security incidents must be reported within 1 hour\n- Annual security awareness training is mandatory"
        status = "approved"
        owner = "CISO"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Acceptable Use Policy"
        content = "# Acceptable Use Policy\n\n## 1. Purpose\nDefines acceptable use of MedCare information systems.\n\n## 2. Policy\n- Systems shall be used for business purposes only\n- Personal use must not interfere with work duties\n- Users shall not attempt to bypass security controls\n- All data transfers must use approved encrypted channels"
        status = "approved"
        owner = "IT Director"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Access Control Policy"
        content = "# Access Control Policy\n\n## 1. Purpose\nEnsures authorized access to MedCare information assets.\n\n## 2. Policy\n- User access shall be provisioned based on role requirements\n- Access reviews shall be conducted quarterly\n- Privileged access requires additional approval\n- Terminated employee access shall be revoked within 1 hour"
        status = "approved"
        owner = "IT Security Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Password Management Policy"
        content = "# Password Management Policy\n\n## 1. Purpose\nEstablishes minimum requirements for password creation and management.\n\n## 2. Policy\n- Minimum 12 characters with complexity requirements\n- Passwords shall be changed every 90 days\n- MFA required for remote access and privileged accounts\n- Password managers are recommended"
        status = "approved"
        owner = "IT Security Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Incident Response Policy"
        content = "# Incident Response Policy\n\n## 1. Purpose\nDefines procedures for responding to security incidents.\n\n## 2. Classification\n- Critical: Active breach or data exfiltration\n- High: Confirmed compromise of non-critical system\n- Medium: Suspicious activity requiring investigation\n- Low: Minor policy violation\n\n## 3. Response\n- CSIRT activated for Critical/High incidents\n- Post-incident review within 5 business days"
        status = "approved"
        owner = "CISO"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Business Continuity Policy"
        content = "# Business Continuity Policy\n\n## 1. Purpose\nEnsures continuity of critical clinical services during disruptions.\n\n## 2. Policy\n- RTO for critical clinical systems: 4 hours\n- RPO for patient data: 1 hour\n- DR site tested quarterly\n- Paper-based fallback procedures maintained"
        status = "approved"
        owner = "IT Operations Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Data Classification Policy"
        content = "# Data Classification Policy\n\n## 1. Purpose\nDefines information classification levels and handling requirements.\n\n## 2. Classification Levels\n- Confidential: Patient records, financial data\n- Internal: Operational procedures, internal communications\n- Public: Published materials, website content\n\n## 3. Handling\n- Confidential data must be encrypted at rest and in transit\n- Printed confidential documents must be stored in locked cabinets"
        status = "approved"
        owner = "DPO"
        module = "privacy"
    },
    @{
        clientId = $clientId
        name = "Data Protection and Privacy Policy"
        content = "# Data Protection and Privacy Policy\n\n## 1. Purpose\nEnsures compliance with UK GDPR and Data Protection Act 2018.\n\n## 2. Policy\n- Lawful basis documented for all processing activities\n- Privacy Impact Assessments mandatory for new processing\n- Data subject requests fulfilled within 30 days\n- Data Protection Officer appointed and contactable"
        status = "approved"
        owner = "DPO"
        module = "privacy"
    },
    @{
        clientId = $clientId
        name = "Supplier Security Policy"
        content = "# Supplier Security Policy\n\n## 1. Purpose\nDefines security requirements for third-party suppliers.\n\n## 2. Policy\n- Security assessment required before onboarding\n- Contracts must include data protection clauses\n- Critical suppliers audited annually\n- Incident notification within 24 hours"
        status = "draft"
        owner = "Procurement Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Network Security Policy"
        content = "# Network Security Policy\n\n## 1. Purpose\nProtects MedCare network infrastructure.\n\n## 2. Policy\n- Firewalls configured with deny-by-default rules\n- Clinical and corporate networks segregated\n- Guest WiFi isolated from internal networks\n- Quarterly firewall rule reviews"
        status = "draft"
        owner = "Network Administrator"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Encryption Policy"
        content = "# Encryption Policy\n\n## 1. Purpose\nDefines encryption requirements for data protection.\n\n## 2. Policy\n- AES-256 for data at rest\n- TLS 1.2+ for data in transit\n- Full disk encryption on all laptops\n- Key management procedures documented"
        status = "draft"
        owner = "IT Security Manager"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Physical Security Policy"
        content = "# Physical Security Policy\n\n## 1. Purpose\nProtects MedCare facilities and physical assets.\n\n## 2. Policy\n- Access to server rooms requires badge + PIN\n- Visitor escort required at all times\n- CCTV retained for 90 days\n- Clean desk policy enforced"
        status = "approved"
        owner = "Facilities Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Asset Management Policy"
        content = "# Asset Management Policy\n\n## 1. Purpose\nEnsures proper management of information assets.\n\n## 2. Policy\n- All IT assets recorded in asset register\n- Asset ownership assigned\n- Secure disposal via certified vendor\n- Annual asset verification"
        status = "approved"
        owner = "IT Asset Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Vulnerability Management Policy"
        content = "# Vulnerability Management Policy\n\n## 1. Purpose\nEnsures timely identification and remediation of vulnerabilities.\n\n## 2. Policy\n- Monthly vulnerability scanning of all assets\n- Critical patches applied within 14 days\n- High patches applied within 30 days\n- Exception process for unpatchable systems"
        status = "draft"
        owner = "IT Security Manager"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Logging and Monitoring Policy"
        content = "# Logging and Monitoring Policy\n\n## 1. Purpose\nEnsures adequate logging for security monitoring.\n\n## 2. Policy\n- Retain logs for minimum 365 days\n- Critical alerts monitored 24/7\n- Privileged actions logged\n- Quarterly log review"
        status = "draft"
        owner = "SOC Manager"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Change Management Policy"
        content = "# Change Management Policy\n\n## 1. Purpose\nEnsures controlled implementation of changes.\n\n## 2. Policy\n- All changes require CAB approval\n- Security impact assessment mandatory\n- Rollback plan documented\n- Post-implementation review within 48 hours"
        status = "approved"
        owner = "IT Service Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Human Resources Security Policy"
        content = "# Human Resources Security Policy\n\n## 1. Purpose\nAddresses security requirements across the employment lifecycle.\n\n## 2. Policy\n- Background checks pre-employment\n- Security clauses in contracts\n- Disciplinary process for violations\n- Exit interview includes security reminder"
        status = "approved"
        owner = "HR Director"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Teleworking Policy"
        content = "# Teleworking Policy\n\n## 1. Purpose\nDefines security requirements for remote working.\n\n## 2. Policy\n- VPN mandatory for all remote access\n- Endpoint device must be MedCare-managed\n- Screens must not be visible to others\n- Public WiFi prohibited without VPN"
        status = "approved"
        owner = "IT Director"
        module = "general"
    }
)

Write-Host "Creating $($policies.Count) policies for Client $clientId..."

$success = 0
$failed = 0

foreach ($policy in $policies) {
    $result = Invoke-TrpcPost -Path "clientPolicies.create" -Data $policy
    
    if ($result.Success) {
        $success++
        $response = $result.Body | ConvertFrom-Json
        Write-Host "Created: $($policy.name) (ID: $($response.result.data.json.id))" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "FAILED: $($policy.name) - $($result.Body.Substring(0, [Math]::Min(100, $result.Body.Length)))" -ForegroundColor Red
    }
}

Write-Host "`nDone! Success: $success, Failed: $failed"
