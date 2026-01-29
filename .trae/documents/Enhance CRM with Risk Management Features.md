
# Enable Compliance Features in CRM Engagement Board

The user wants to expand the CRM to manage "client engagement and compliance-related activities". Currently, the Engagement Board displays Controls, Activities, and Tasks, but is missing **Risk Management**, which is a key part of compliance.

I will enhance the CRM module to include Risk visibility within Engagements.

## Technical Implementation

### 1. Backend Updates (CRM Service)
- **Modify `lib/modules/crm/types.ts`**:
    - Update `EngagementDetails` interface to include a `risks` array.
    - Define `EngagementRisk` type (subset of `RiskScenario`).
- **Modify `lib/modules/crm/service.ts`**:
    - Update `getEngagementDetails` to fetch `risk_scenarios` for the client.
    - Currently, there is no direct link between Engagement and Risk, so I will fetch **all active risks** for the client as a starting point (similar to Activities). This allows the Engagement Manager to see the client's risk posture.

### 2. Frontend Updates (Engagement Board)
- **Modify `components/modules/crm/EngagementBoard.tsx`**:
    - Add a new Tab **"Risks"** alongside "Controls", "Activity", and "Tasks".
    - Implement a `RiskList` view inside this tab to display:
        - Risk Title
        - Risk Level (Likelihood x Impact)
        - Status (Identified, Treated, etc.)
    - This gives the user a complete view of "Compliance-related activities" (Controls + Risks + Tasks).

### 3. Verification
- Verify the "Risks" tab appears in the Engagement Board.
- Verify risks are loaded correctly.
