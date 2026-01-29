# Krayin CRM Integration Plan

Based on your request, I will implement a native Sales CRM module inspired by Krayin, starting with a new git branch.

## 1. Environment Setup
*   **Create Branch**: Create and switch to a new branch `feature/crm-integration` to isolate changes.

## 2. Database Schema Implementation
I will extend `schema.ts` to include Krayin-like sales entities:
*   **`crm_leads`**: Stores prospect details (Source, Status, Contact Info).
*   **`crm_deals`**: Stores opportunity data (Amount, Stage, Probability, Expected Close Date).
*   **`crm_pipelines`**: Defines sales stages (e.g., Lead -> Qualification -> Proposal -> Negotiation -> Won).
*   **Relations**: Link Deals to Leads and existing Users (Owners).

## 3. Backend API (tRPC)
*   Create `lib/modules/crm/sales-router.ts` to handle:
    *   `createLead`, `updateLead`
    *   `getPipeline` (Kanban data)
    *   `moveDeal` (Stage updates)

## 4. Frontend UI (React)
*   **Sales Dashboard**: Add a "Sales" tab to the main CRM module.
*   **Kanban Board**: Re-use the existing Kanban component to visualize Deals by Stage.
*   **Lead Form**: A dialog to add new Leads/Deals.

## Execution Order
1.  Create Branch.
2.  Update Schema & Push DB changes.
3.  Implement Backend Router.
4.  Implement Frontend UI.

**Ready to start with Step 1: Create Branch.**