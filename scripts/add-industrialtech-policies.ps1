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

$clientId = 14

Write-Host "=== Case Study 8: IndustrialTech Policies Implementation ===" -ForegroundColor Cyan

# Create 10 Manufacturing-specific Policies
Write-Host "`nCreating 10 Policies for IndustrialTech..." -ForegroundColor Yellow
$policies = @(
    @{
        clientId = $clientId
        name = "OT/ICS Security Policy"
        content = "# OT/ICS Security Policy\n\n## 1. Purpose\nProtect operational technology and industrial control systems from cyber threats.\n\n## 2. Scope\nAll SCADA, PLC, DCS, and ICS systems across manufacturing facilities.\n\n## 3. Policy\n- OT networks shall be air-gapped from corporate IT\n- All OT system changes require change advisory board approval\n- USB devices prohibited on OT systems without authorisation\n- OT-specific incident response plan maintained\n- Annual OT security risk assessment conducted\n- Vendor remote access to OT requires multi-factor authentication and monitoring"
        status = "approved"
        owner = "OT Security Manager"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Manufacturing Execution System (MES) Security Policy"
        content = "# MES Security Policy\n\n## 1. Purpose\nProtect Manufacturing Execution Systems from unauthorised access and modification.\n\n## 2. Policy\n- Role-based access control enforced for all MES functions\n- Production data integrity verified before use\n- MES backups performed daily and tested monthly\n- All MES modifications tested in staging before production\n- Audit logging enabled for all MES transactions"
        status = "approved"
        owner = "Manufacturing IT Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Industrial IoT Device Security Policy"
        content = "# Industrial IoT Device Security Policy\n\n## 1. Purpose\nSecure deployment and operation of IIoT devices across manufacturing facilities.\n\n## 2. Policy\n- All IIoT devices must be approved by security team before deployment\n- Default credentials changed immediately upon installation\n- IIoT devices segmented on dedicated network VLAN\n- Firmware updates applied within 30 days of release\n- Device inventory maintained and audited quarterly\n- End-of-life devices decommissioned securely"
        status = "draft"
        owner = "IoT Security Engineer"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Supply Chain Security Policy"
        content = "# Supply Chain Security Policy\n\n## 1. Purpose\nManage cybersecurity risks in the manufacturing supply chain.\n\n## 2. Policy\n- Critical suppliers must provide SOC 2 Type II or equivalent\n- Software bill of materials (SBOM) required for all procured software\n- Supplier security assessments conducted annually\n- Contractual security requirements for all vendors\n- Incident notification within 24 hours from critical suppliers"
        status = "approved"
        owner = "Supply Chain Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Data Classification and Handling Policy"
        content = "# Data Classification and Handling Policy\n\n## 1. Purpose\nDefine classification levels and handling requirements for organisational data.\n\n## 2. Classification Levels\n- Confidential: Trade secrets, product designs, customer data\n- Internal: Operational data, employee records\n- Public: Marketing materials, published specifications\n\n## 3. Handling\n- Confidential data encrypted at rest and in transit\n- Confidential documents watermarked and access-controlled\n- USB storage prohibited for confidential data\n- Secure shredding for physical confidential documents"
        status = "approved"
        owner = "Data Protection Officer"
        module = "privacy"
    },
    @{
        clientId = $clientId
        name = "Physical Security Policy"
        content = "# Physical Security Policy\n\n## 1. Purpose\nProtect manufacturing facilities and assets from physical threats.\n\n## 2. Policy\n- Perimeter fencing and CCTV at all manufacturing sites\n- Badge access control for all facility entry points\n- Visitor escort required at all times in production areas\n- Clean desk policy enforced in all areas\n- Sensitive areas require additional biometric authentication\n- Security patrols during non-production hours"
        status = "approved"
        owner = "Facilities Security Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Remote Access Policy"
        content = "# Remote Access Policy\n\n## 1. Purpose\nDefine requirements for remote access to IndustrialTech systems.\n\n## 2. Policy\n- VPN required for all remote access to corporate network\n- Multi-factor authentication mandatory\n- Remote access to OT systems requires additional approval\n- Privileged remote access requires session recording\n- Remote access revoked within 4 hours of termination\n- Quarterly review of remote access permissions"
        status = "approved"
        owner = "IT Security Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Patch Management Policy"
        content = "# Patch Management Policy\n\n## 1. Purpose\nEnsure timely identification and remediation of vulnerabilities.\n\n## 2. Policy\n- IT systems patched within 30 days of release\n- OT systems patched during planned maintenance windows\n- Emergency patching process for critical vulnerabilities (72 hours)\n- Patch testing required before production deployment\n- Exception process for systems that cannot be patched\n- Monthly patch compliance reporting"
        status = "draft"
        owner = "IT Operations Manager"
        module = "cyber"
    },
    @{
        clientId = $clientId
        name = "Business Continuity and Disaster Recovery Policy"
        content = "# BC/DR Policy\n\n## 1. Purpose\nEnsure continuity of critical manufacturing operations during disruptions.\n\n## 2. Policy\n- RTO for critical systems: 4 hours\n- RPO for production data: 1 hour\n- DR testing conducted quarterly\n- Alternate production site identified and maintained\n- Paper-based procedures for extended outages\n- Annual BC plan review and update"
        status = "approved"
        owner = "BC Manager"
        module = "general"
    },
    @{
        clientId = $clientId
        name = "Security Awareness Training Policy"
        content = "# Security Awareness Training Policy\n\n## 1. Purpose\nEnsure all personnel understand and fulfil their security responsibilities.\n\n## 2. Policy\n- Annual security awareness training mandatory for all employees\n- OT-specific security training for manufacturing staff\n- Phishing simulation exercises quarterly\n- Role-specific training for privileged users\n- New starter security induction within first week\n- Training completion tracked and reported to management"
        status = "approved"
        owner = "Training Manager"
        module = "general"
    }
)

$success = 0
$failed = 0

foreach ($policy in $policies) {
    $result = Invoke-TrpcPost -Path "clientPolicies.create" -Data $policy
    
    if ($result.Success) {
        $id = ($result.Body | ConvertFrom-Json).result.data.json.id
        Write-Host "  Created: $($policy.name) (ID: $id) - $($policy.status)" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  FAILED: $($policy.name) - $($result.Body.Substring(0, [Math]::Min(80, $result.Body.Length)))" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=== Case Study 8 Complete ===" -ForegroundColor Cyan
Write-Host "Success: $success, Failed: $failed" -ForegroundColor White
