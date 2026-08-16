Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

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

$assessmentId = 4

# All 95 ISO 27001 controls with realistic statuses for a healthcare organization
$controls = @(
    @{ ControlId = "A.5-Policies"; Name = "Information Security Policies"; Status = "implemented"; Notes = "Board-approved ISMS policy in place since 2023" },
    @{ ControlId = "A.5.1"; Name = "Policies for information security"; Status = "implemented"; Notes = "Comprehensive policy suite covering all Annex A domains" },
    @{ ControlId = "A.5.2"; Name = "Information security roles and responsibilities"; Status = "implemented"; Notes = "CISO appointed, security team of 4 FTEs" },
    @{ ControlId = "A.5.3"; Name = "Segregation of duties"; Status = "partially_implemented"; Notes = "Basic SoD in financial systems, gaps in IT admin functions" },
    @{ ControlId = "A.5.4"; Name = "Management responsibilities"; Status = "implemented"; Notes = "Quarterly security briefings to executive committee" },
    @{ ControlId = "A.5.5"; Name = "Contact with authorities"; Status = "implemented"; Notes = "Established contacts with ICO, NHS Digital, local police cyber unit" },
    @{ ControlId = "A.5.6"; Name = "Contact with special interest groups"; Status = "partially_implemented"; Notes = "Member of H-ISAC, limited engagement with other bodies" },
    @{ ControlId = "A.5.7"; Name = "Threat intelligence"; Status = "not_implemented"; Notes = "No formal threat intelligence program in place" },
    @{ ControlId = "A.5.8"; Name = "Information security in project management"; Status = "partially_implemented"; Notes = "Security review gate exists but not consistently enforced" },
    @{ ControlId = "A.5.9"; Name = "Inventory of information and other associated assets"; Status = "partially_implemented"; Notes = "Asset register exists for IT assets, missing clinical systems" },
    @{ ControlId = "A.5.10"; Name = "Acceptable use of information and other associated assets"; Status = "implemented"; Notes = "AUP signed by all staff annually" },
    @{ ControlId = "A.5.11"; Name = "Return of assets"; Status = "implemented"; Notes = "Offboarding checklist includes asset return verification" },
    @{ ControlId = "A.5.12"; Name = "Classification of information"; Status = "partially_implemented"; Notes = "4-tier classification scheme defined, inconsistent application" },
    @{ ControlId = "A.5.13"; Name = "Labelling of information"; Status = "not_implemented"; Notes = "No automated labelling solution deployed" },
    @{ ControlId = "A.5.14"; Name = "Information transfer"; Status = "partially_implemented"; Notes = "Secure email for external comms, no DLP solution" },
    @{ ControlId = "A.5.15"; Name = "Access control"; Status = "implemented"; Notes = "Role-based access control implemented across core systems" },
    @{ ControlId = "A.5.16"; Name = "Identity management"; Status = "partially_implemented"; Notes = "Active Directory in place, no identity governance platform" },
    @{ ControlId = "A.5.17"; Name = "Authentication information"; Status = "partially_implemented"; Notes = "Password policy enforced, MFA only for remote access" },
    @{ ControlId = "A.5.18"; Name = "Access rights"; Status = "partially_implemented"; Notes = "Quarterly access reviews for financial systems only" },
    @{ ControlId = "A.5.19"; Name = "Information security in supplier relationships"; Status = "partially_implemented"; Notes = "Security clauses in major contracts, gaps in SME suppliers" },
    @{ ControlId = "A.5.20"; Name = "Addressing information security within supplier agreements"; Status = "partially_implemented"; Notes = "Standard security addendum used, not tailored per supplier" },
    @{ ControlId = "A.5.21"; Name = "Managing information security in the ICT supply chain"; Status = "not_implemented"; Notes = "No formal supply chain security program" },
    @{ ControlId = "A.5.22"; Name = "Monitoring, review and change management of supplier services"; Status = "partially_implemented"; Notes = "Annual supplier reviews for critical vendors only" },
    @{ ControlId = "A.5.23"; Name = "Information security for use of cloud services"; Status = "partially_implemented"; Notes = "Cloud security policy exists, limited visibility into SaaS configs" },
    @{ ControlId = "A.5.24"; Name = "Information security incident management planning and preparation"; Status = "implemented"; Notes = "Incident response plan documented and tested annually" },
    @{ ControlId = "A.5.25"; Name = "Assessment and decision on information security events"; Status = "partially_implemented"; Notes = "Event classification matrix defined, manual triage process" },
    @{ ControlId = "A.5.26"; Name = "Response to information security incidents"; Status = "implemented"; Notes = "CSIRT team established, runbooks for common scenarios" },
    @{ ControlId = "A.5.27"; Name = "Learning from information security incidents"; Status = "partially_implemented"; Notes = "Post-incident reviews conducted, lessons not always shared" },
    @{ ControlId = "A.5.28"; Name = "Collection of evidence"; Status = "partially_implemented"; Notes = "Basic forensic capability, no dedicated forensic workstation" },
    @{ ControlId = "A.5.29"; Name = "Information security during disruption"; Status = "partially_implemented"; Notes = "BCP covers IT outages, limited cyber-specific scenarios" },
    @{ ControlId = "A.5.30"; Name = "ICT readiness for business continuity"; Status = "partially_implemented"; Notes = "DR site for critical systems, RTOs not fully validated" },
    @{ ControlId = "A.5.31"; Name = "Legal, statutory, regulatory and contractual requirements"; Status = "implemented"; Notes = "Compliance register maintained, quarterly legal review" },
    @{ ControlId = "A.5.32"; Name = "Intellectual property rights"; Status = "implemented"; Notes = "IP policy in place, software licensing audited annually" },
    @{ ControlId = "A.5.33"; Name = "Protection of records"; Status = "partially_implemented"; Notes = "Records retention schedule defined, enforcement inconsistent" },
    @{ ControlId = "A.5.34"; Name = "Privacy and protection of PII"; Status = "implemented"; Notes = "DPO appointed, privacy impact assessments mandatory" },
    @{ ControlId = "A.5.35"; Name = "Independent review of information security"; Status = "partially_implemented"; Notes = "Annual external audit, no continuous monitoring" },
    @{ ControlId = "A.5.36"; Name = "Compliance with policies, rules and standards"; Status = "partially_implemented"; Notes = "Compliance monitoring via internal audit, gaps in technical controls" },
    @{ ControlId = "A.5.37"; Name = "Documented operating procedures"; Status = "implemented"; Notes = "SOPs documented for all critical IT processes" },
    @{ ControlId = "A.6.1"; Name = "Screening"; Status = "implemented"; Notes = "Background checks for all staff including NHS checks" },
    @{ ControlId = "A.6.2"; Name = "Terms and conditions of employment"; Status = "implemented"; Notes = "Security clauses in all employment contracts" },
    @{ ControlId = "A.6.3"; Name = "Information security awareness, education and training"; Status = "partially_implemented"; Notes = "Annual e-learning, no role-specific training program" },
    @{ ControlId = "A.6.4"; Name = "Disciplinary process"; Status = "implemented"; Notes = "Security violations included in disciplinary policy" },
    @{ ControlId = "A.6.5"; Name = "Responsibilities after termination or change of employment"; Status = "implemented"; Notes = "Checklist-based offboarding with 24hr access revocation SLA" },
    @{ ControlId = "A.6.6"; Name = "Confidentiality or non-disclosure agreements"; Status = "implemented"; Notes = "NDAs signed by all staff and contractors" },
    @{ ControlId = "A.6.7"; Name = "Remote working"; Status = "partially_implemented"; Notes = "VPN required, no endpoint compliance checking" },
    @{ ControlId = "A.6.8"; Name = "Information security event reporting"; Status = "implemented"; Notes = "Phishing reporting button, 24/7 security hotline" },
    @{ ControlId = "A.7.1"; Name = "Physical security perimeters"; Status = "implemented"; Notes = "Fenced perimeter, CCTV, access control at all sites" },
    @{ ControlId = "A.7.2"; Name = "Physical entry"; Status = "implemented"; Notes = "Badge access, visitor management system, reception staffing" },
    @{ ControlId = "A.7.3"; Name = "Securing offices, rooms and facilities"; Status = "partially_implemented"; Notes = "Server rooms secured, general office areas less controlled" },
    @{ ControlId = "A.7.4"; Name = "Physical security monitoring"; Status = "implemented"; Notes = "24/7 CCTV recording, security guards at main sites" },
    @{ ControlId = "A.7.5"; Name = "Protecting against physical and environmental threats"; Status = "partially_implemented"; Notes = "Fire suppression in data centre, not in all server rooms" },
    @{ ControlId = "A.7.6"; Name = "Working in secure areas"; Status = "implemented"; Notes = "Clean desk policy, secure areas access-controlled" },
    @{ ControlId = "A.7.7"; Name = "Clear desk and clear screen"; Status = "implemented"; Notes = "Policy enforced, automatic screen lock after 5 minutes" },
    @{ ControlId = "A.7.8"; Name = "Equipment siting and protection"; Status = "partially_implemented"; Notes = "Critical equipment in secure areas, some exposed endpoints" },
    @{ ControlId = "A.7.9"; Name = "Security of assets off-premises"; Status = "partially_implemented"; Notes = "Encryption required for laptops, no mobile device management" },
    @{ ControlId = "A.7.10"; Name = "Storage media"; Status = "partially_implemented"; Notes = "Encryption for portable media, no media disposal tracking" },
    @{ ControlId = "A.7.11"; Name = "Supporting utilities"; Status = "implemented"; Notes = "UPS and generator backup at main sites" },
    @{ ControlId = "A.7.12"; Name = "Cabling security"; Status = "partially_implemented"; Notes = "Data cabling in conduit at main sites, gaps at smaller clinics" },
    @{ ControlId = "A.7.13"; Name = "Equipment maintenance"; Status = "implemented"; Notes = "Preventive maintenance schedule for all critical infrastructure" },
    @{ ControlId = "A.7.14"; Name = "Secure disposal or re-use of equipment"; Status = "partially_implemented"; Notes = "Certified disposal vendor, no data destruction verification" },
    @{ ControlId = "A.8.1"; Name = "User endpoint devices"; Status = "partially_implemented"; Notes = "Antivirus on all endpoints, no EDR solution" },
    @{ ControlId = "A.8.2"; Name = "Privileged access rights"; Status = "partially_implemented"; Notes = "Separate admin accounts, no PAM solution" },
    @{ ControlId = "A.8.3"; Name = "Information access restriction"; Status = "implemented"; Notes = "Access based on need-to-know, enforced via AD groups" },
    @{ ControlId = "A.8.4"; Name = "Access to source code"; Status = "not_applicable"; Notes = "No in-house software development" },
    @{ ControlId = "A.8.5"; Name = "Secure authentication"; Status = "partially_implemented"; Notes = "MFA for remote access only, no passwordless authentication" },
    @{ ControlId = "A.8.6"; Name = "Capacity management"; Status = "partially_implemented"; Notes = "Monitoring for critical systems, no predictive capacity planning" },
    @{ ControlId = "A.8.7"; Name = "Protection against malware"; Status = "implemented"; Notes = "Enterprise antivirus, email filtering, web proxy" },
    @{ ControlId = "A.8.8"; Name = "Management of technical vulnerabilities"; Status = "partially_implemented"; Notes = "Monthly patching cycle, no vulnerability scanning for all assets" },
    @{ ControlId = "A.8.9"; Name = "Configuration management"; Status = "partially_implemented"; Notes = "Baseline configs for servers, no configuration compliance monitoring" },
    @{ ControlId = "A.8.10"; Name = "Information deletion"; Status = "not_implemented"; Notes = "No automated data deletion based on retention schedule" },
    @{ ControlId = "A.8.11"; Name = "Data masking"; Status = "not_implemented"; Notes = "No data masking in non-production environments" },
    @{ ControlId = "A.8.12"; Name = "Data leakage prevention"; Status = "not_implemented"; Notes = "No DLP solution deployed" },
    @{ ControlId = "A.8.13"; Name = "Information backup"; Status = "implemented"; Notes = "Daily backups for critical systems, quarterly restore tests" },
    @{ ControlId = "A.8.14"; Name = "Redundancy of information processing facilities"; Status = "partially_implemented"; Notes = "Redundant internet, single data centre for most systems" },
    @{ ControlId = "A.8.15"; Name = "Logging"; Status = "partially_implemented"; Notes = "Windows event logs retained 90 days, no centralised SIEM" },
    @{ ControlId = "A.8.16"; Name = "Monitoring activities"; Status = "not_implemented"; Notes = "No SOC capability, reactive monitoring only" },
    @{ ControlId = "A.8.17"; Name = "Clock synchronisation"; Status = "implemented"; Notes = "NTP configured on all servers" },
    @{ ControlId = "A.8.18"; Name = "Use of privileged utility programs"; Status = "partially_implemented"; Notes = "Admin tools restricted, no application whitelisting" },
    @{ ControlId = "A.8.19"; Name = "Installation of software on operational systems"; Status = "partially_implemented"; Notes = "Software approval process, no application control solution" },
    @{ ControlId = "A.8.20"; Name = "Networks security"; Status = "partially_implemented"; Notes = "Firewall and VLAN segmentation, no microsegmentation" },
    @{ ControlId = "A.8.21"; Name = "Security of network services"; Status = "partially_implemented"; Notes = "Firewall rules reviewed annually, no automated rule analysis" },
    @{ ControlId = "A.8.22"; Name = "Segregation of networks"; Status = "partially_implemented"; Notes = "Clinical and corporate networks separated, guest WiFi isolated" },
    @{ ControlId = "A.8.23"; Name = "Web filtering"; Status = "implemented"; Notes = "DNS filtering and web proxy deployed" },
    @{ ControlId = "A.8.24"; Name = "Use of cryptography"; Status = "partially_implemented"; Notes = "TLS 1.2 for web services, no enterprise key management" },
    @{ ControlId = "A.8.25"; Name = "Secure development life cycle"; Status = "not_applicable"; Notes = "No in-house development" },
    @{ ControlId = "A.8.26"; Name = "Application security requirements"; Status = "not_applicable"; Notes = "No in-house development" },
    @{ ControlId = "A.8.27"; Name = "Secure system architecture and engineering principles"; Status = "not_applicable"; Notes = "No in-house development" },
    @{ ControlId = "A.8.28"; Name = "Secure coding"; Status = "not_applicable"; Notes = "No in-house development" },
    @{ ControlId = "A.8.29"; Name = "Security testing in development and acceptance"; Status = "not_applicable"; Notes = "No in-house development" },
    @{ ControlId = "A.8.30"; Name = "Outsourced development"; Status = "partially_implemented"; Notes = "Security requirements in vendor contracts, no code review" },
    @{ ControlId = "A.8.31"; Name = "Separation of development, test and production environments"; Status = "not_applicable"; Notes = "No in-house development" },
    @{ ControlId = "A.8.32"; Name = "Change management"; Status = "implemented"; Notes = "ITIL-based change advisory board, all changes documented" },
    @{ ControlId = "A.8.33"; Name = "Test information"; Status = "not_implemented"; Notes = "Production data sometimes used in testing" },
    @{ ControlId = "A.8.34"; Name = "Protection of information systems during audit testing"; Status = "partially_implemented"; Notes = "Audit accounts monitored, no dedicated audit environment" },
    @{ ControlId = "A.9-Access"; Name = "Access Control"; Status = "implemented"; Notes = "Comprehensive access control policy and procedures" }
)

Write-Host "Adding $($controls.Count) gap responses for MedCare Gap Analysis ID $assessmentId..."

$success = 0
$failed = 0

foreach ($ctrl in $controls) {
    $body = @{
        assessmentId = $assessmentId
        controlId = $ctrl.ControlId
        currentStatus = $ctrl.Status
        targetStatus = "implemented"
        notes = $ctrl.Notes
    }
    
    $result = Invoke-TrpcPost -Path "gapAnalysis.updateResponse" -Data $body
    
    if ($result.Success) {
        $success++
    } else {
        $failed++
        Write-Host "FAILED: $($ctrl.ControlId) - $($result.Body.Substring(0, [Math]::Min(100, $result.Body.Length)))" -ForegroundColor Red
    }
}

Write-Host "`nDone! Success: $success, Failed: $failed"
