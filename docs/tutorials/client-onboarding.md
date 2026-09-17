# Client Onboarding Tutorial

This tutorial walks ComplianceMSP administrators through the 7-step wizard at `/clients/new/msp` to provision a new client workspace.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Accessing the Wizard](#accessing-the-wizard)
3. [Step-by-Step Walkthrough](#step-by-step-walkthrough)
4. [What Happens Behind the Scenes](#what-happens-behind-the-scenes)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps After Onboarding](#next-steps-after-onboarding)

---

## Prerequisites

Before launching the onboarding wizard, ensure you have the following:

| Requirement | Details |
|-------------|---------|
| **MSP Administrator account** | You must be logged in with `admin`, `owner`, or `super_admin` role |
| **Client company name** | Legal name or trading name of the organisation |
| **Industry classification** | Used to prioritise controls and tailor policy templates |
| **Framework requirements** | Which compliance standards the client must meet (e.g., ISO 27001, SOC 2, GDPR) |
| **Client contact details** | Name and email of the person who will manage their workspace (optional during wizard) |
| **Plan capacity** | Your account must have available client slots (`maxClients` limit not reached) |

> **Note:** Community Edition accounts are limited to a single workspace. Upgrade to Enterprise for multi-tenancy.

---

## Accessing the Wizard

Navigate to **Clients** → **New Client** in the MSP cockpit, or go directly to:

```
/clients/new/msp
```

The wizard displays a progress bar at the top and step indicator pills showing your position in the flow.

---

## Step-by-Step Walkthrough

### Step 1: Company Info

Collects basic information about the client organisation.

| Field | Required | Description |
|-------|----------|-------------|
| **Company Name** | Yes | Displayed throughout the workspace and on generated policies |
| **Industry** | Yes | Select one from: FinTech, HealthTech, SaaS, E-commerce, Legal, Consulting, Manufacturing, Education, Government, Other |
| **Website** | No | Used for context in policy generation |
| **Employees** | No | Size bracket: 1–10, 11–50, 51–200, 201–500, 500+ |
| **Description** | No | Free-text context for AI-assisted features |

**Validation:** Company Name and Industry must be set before you can proceed.

---

### Step 2: Frameworks

Select the compliance frameworks the client needs to implement. You can select multiple.

| Framework | Controls | Best For |
|-----------|----------|----------|
| **ISO 27001** | 114 | International information security management (most popular) |
| **SOC 2 Type II** | 60 | SaaS & cloud services (US standard) |
| **GDPR** | 45 | EU data protection and privacy |
| **NIST CSF 2.0** | 108 | Critical infrastructure, government, federal |
| **ISO 27701** | 49 | Privacy information management (extends ISO 27001) |
| **CMMC 2.0** | 110 | US Department of Defense contractors |

The wizard shows the total number of controls that will be generated based on your selection.

**Validation:** At least one framework must be selected. ISO 27001 is selected by default.

---

### Step 3: Risk Profile

Helps prioritise controls by understanding the client's operational context.

Toggle the following options as applicable:

| Option | Description |
|--------|-------------|
| **Cloud-first infrastructure** | Systems run primarily in the cloud (AWS, Azure, GCP) |
| **Processes personal data** | Stores or processes customer PII or employee data |
| **Operates in a regulated industry** | Finance, health, government, or critical infrastructure |

You can also add free-text notes for specific compliance requirements or security concerns.

**Validation:** None — all fields are optional. Click **Continue** when ready.

---

### Step 4: Branding

Customises how the workspace appears to the client (white-label configuration).

| Field | Description |
|-------|-------------|
| **Workspace name** | Defaults to `{Company Name} Compliance Portal` |
| **Tagline** | Displayed beneath the workspace name |
| **Accent colour** | Colour picker with presets: indigo, cyan, emerald, amber, red, purple |

A live preview card shows how the branding will appear to the client.

**Validation:** None — all fields are optional with sensible defaults.

---

### Step 5: Invite Client

Invite the client contact to access their workspace.

| Field | Description |
|-------|-------------|
| **Contact Name** | Full name of the client representative |
| **Contact Email** | Used to send the invitation |
| **Send invitation email** | Toggle on to dispatch immediately |

When enabled, the client receives a secure link to access the workspace. They can only see their own data — your MSP account remains private.

You can **skip this step** and configure the invitation later.

**Validation:** None — click **Continue to review** when ready.

---

### Step 6: Review & Confirm

Displays a summary of all selections before provisioning:

- **Company** — name, industry, employee count, website
- **Frameworks** — selected frameworks and total control count
- **Risk Profile** — active risk flags
- **Branding** — workspace name, tagline, accent colour
- **Contact** — invited user details and invitation status

> **Note:** All settings can be updated after launch. Click any step indicator to go back and make changes.

---

### Step 7: Launch

Click **Launch workspace** to provision the client. During processing:

1. A spinner displays with "Launching..."
2. The system executes the backend onboarding transaction
3. On success, the confirmation screen displays

The success screen shows:

| Metric | Value |
|--------|-------|
| **Frameworks** | Count of assigned frameworks |
| **Controls** | Total controls generated |
| **AI Policies** | Auto-generated |

You can then:
- **Back to clients** — return to the client list
- **Setup employee onboarding** — configure employee compliance requirements
- **Enter workspace** — open the new client workspace

---

## What Happens Behind the Scenes

When you click **Launch workspace**, the system executes a transactional onboarding process via `db.onboardClient()`:

### 1. Client Record Creation

A new row is inserted into the `clients` table with status `active`.

### 2. User Assignment

The current user is assigned as `owner` in the `userClients` table, granting full administrative access.

### 3. Framework Assignment

The system assigns two categories of frameworks:

**User-selected frameworks** (from Step 2):
- ISO 27001, SOC 2, GDPR, NIST CSF 2.0, ISO 27701, CMMC 2.0

**Native OWASP standards** (always included):
| Standard | Purpose |
|----------|---------|
| SAMM | Software Assurance Maturity Model |
| ASVS | Application Security Verification Standard |
| SCVS | Software Component Verification Standard |
| WSTG | Web Security Testing Guide |
| MASVS | Mobile Application Security Verification Standard |
| OWASP LLM Top 10 | Large Language Model risks |
| OWASP ASI | Agentic Software Integrity |
| NIST AI RMF | AI Risk Management Framework |
| EU AI Act | EU AI regulation |
| OPENSSF | Open Source Security Foundation |
| AISVS | AI Security Verification Standard |
| WEB-T10 | Web Top 10 threats |
| API-T10 | API Top 10 threats |

### 4. Control Generation

`bulkAssignControls()` queries the controls database for each framework and creates `clientControls` entries:

```typescript
{
  clientId: number,
  controlId: number,
  clientControlId: "CC-001",  // Sequential ID
  status: "not_implemented"
}
```

Duplicate controls across frameworks are deduplicated automatically.

### 5. Policy Generation

`bulkGeneratePolicies()` creates policies from templates, customised with the client's company name. Existing templates are skipped to prevent duplicates.

### 6. Compliance Requirements Seeding

The system seeds 12 default compliance requirements for employee onboarding:

| # | Requirement | Category | Mandatory |
|---|-------------|----------|-----------|
| 1 | Code of Conduct | Ethics & Conduct | Yes |
| 2 | Acceptable Use Policy | IT Security | Yes |
| 3 | Data Protection Agreement | Privacy & Data | Yes |
| 4 | Confidentiality & NDA | Legal | Yes |
| 5 | Information Security Policy | IT Security | Yes |
| 6 | Anti-Harassment Policy | Ethics & Conduct | Yes |
| 7 | Health & Safety Policy | Safety | Yes |
| 8 | Remote Work Policy | Workplace | Yes |
| 9 | Social Media Policy | Communications | No |
| 10 | Travel & Expense Policy | Finance | Yes |
| 11 | Whistleblower Policy | Ethics & Conduct | Yes |
| 12 | AI Usage Policy | IT Security | Yes |

These requirements are available at `/clients/{id}/settings?tab=onboarding` after launch.

---

## Troubleshooting

### "Organization Limit Reached"

| Cause | Solution |
|-------|----------|
| Your plan's `maxClients` limit has been reached | Upgrade your plan or remove an existing client |

**Error message variants:**
- *"Your current plan allows for 2 organizations. Please upgrade to add more."*
- *"Community Edition is limited to a single workspace. Please upgrade to Enterprise for multi-tenancy."*

---

### "Please enter a company name and select an industry"

| Cause | Solution |
|-------|----------|
| Step 1 fields incomplete | Enter a company name and click an industry option before continuing |

---

### "Please select at least one framework"

| Cause | Solution |
|-------|----------|
| All frameworks deselected in Step 2 | Click at least one framework card to select it |

---

### "Failed to create workspace. Please try again."

| Cause | Solution |
|-------|----------|
| Network interruption | Check connection and retry |
| Database transaction failure | Check server logs for `[Clients] Onboard Error` |
| Authentication expired | Re-login and restart the wizard |

---

### Invitation email not received

| Cause | Solution |
|-------|----------|
| Email in spam/junk folder | Check spam folder |
| `sendInvite` was toggled off | Re-enable in client settings |
| SMTP misconfiguration | Verify email transporter configuration in environment variables |

To resend: navigate to **Clients** → `{Client}` → **Settings** → **Team** → **Invite User**.

---

### Client cannot access workspace

| Cause | Solution |
|-------|----------|
| User not assigned to client | Verify assignment in `userClients` table |
| Wrong email used | Confirm the invited email matches their login |
| Password not set | New users must use "Forgot Password" to set credentials |

---

## Next Steps After Onboarding

Once the workspace is provisioned:

1. **Configure employee onboarding**
   - Navigate to `/clients/{id}/settings?tab=onboarding`
   - Customise the 12 default compliance requirements
   - Add role-specific requirements

2. **Review generated controls**
   - Go to **Frameworks** → **Controls**
   - Assign control owners
   - Set implementation priorities based on risk profile

3. **Customise policies**
   - Go to **Policies**
   - Review AI-generated policy drafts
   - Submit for client approval

4. **Invite team members**
   - Navigate to **Settings** → **Team**
   - Assign roles: `owner`, `editor`, or `viewer`

5. **Upload evidence**
   - Go to **Evidence**
   - Map evidence to controls to track compliance progress

6. **Schedule gap analysis**
   - Run an initial gap analysis report
   - Set target compliance score
   - Establish remediation timeline

---

## Related Documentation

- [Employee Onboarding Guide](../features/employee-onboarding-guide.md)
- [Framework Implementation Guide](../features/framework-implementation-guide.md)
- [Policy Management Guide](../features/policy-management-guide.md)
- [Architecture Overview](../architecture.md)
- [Database Schema](../database-schema.md)
