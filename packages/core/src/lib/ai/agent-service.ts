/**
 * Agentic AI Service
 * 
 * Provides tools and execution environment for AI Agents in ComplianceOS.
 */

import { integrationRegistry } from '../integrations/registry';
import { getDb } from '../../db';
import { integrations as integrationsTable } from '../../schema';
import { eq, and } from 'drizzle-orm';
import type { IntegrationContext, IntegrationResult } from '../integrations/types';

export interface ProposedAction {
    id: string;
    type: 'integration' | 'core' | 'notification';
    slug: string; // provider slug for integrations, or 'core' for internal
    actionId: string;
    params: any;
    label: string;
    description: string;
    contextId?: string;
}

export class AgentService {
    /**
     * Get a list of available tools for a specific client
     */
    static async getAvailableTools(clientId: number) {
        const db = await getDb();
        const connections = await db.select()
            .from(integrationsTable)
            .where(and(
                eq(integrationsTable.clientId, clientId),
                eq(integrationsTable.isActive, true)
            ));

        const integrationTools: any[] = [];

        for (const conn of connections) {
            const manifest = integrationRegistry.get(conn.provider);
            if (manifest) {
                integrationTools.push({
                    slug: manifest.slug,
                    name: manifest.name,
                    actions: manifest.actions
                });
            }
        }

        const coreTools = [
            {
                slug: 'core',
                name: 'GRCompliance Core',
                actions: [
                    {
                        id: 'create-task',
                        name: 'Create Task',
                        description: 'Create a new project task or remediation item',
                        params: {
                            title: 'string',
                            description: 'string',
                            priority: 'low|medium|high|critical'
                        }
                    },
                    {
                        id: 'update-control-status',
                        name: 'Update Control Status',
                        description: 'Update the implementation status of a specific control',
                        params: {
                            controlId: 'string',
                            status: 'not_implemented|in_progress|implemented|not_applicable'
                        }
                    },
                    {
                        id: 'generate-policy-draft',
                        name: 'Update Policy Draft',
                        description: 'Update the draft content of a policy',
                        params: {
                            policyId: 'number',
                            content: 'markdown-content'
                        }
                    }
                ]
            }
        ];

        return { integrations: integrationTools, core: coreTools };
    }

    /**
     * Build a live compliance context snapshot for system prompt injection.
     * Fetches real-time data: control status, critical risks, expiring evidence, open incidents.
     */
    static async buildContextSnapshot(clientId: number): Promise<string> {
        try {
            const db = await getDb();
            const { clientControls, riskAssessments, evidence, incidents, clients } = await import('../../schema');
            const { desc, gte, lte, and: dbAnd, eq: dbEq } = await import('drizzle-orm');

            // 1. Org name
            const [org] = await db.select({ name: clients.name, industry: (clients as any).industry })
                .from(clients).where(dbEq(clients.id, clientId)).limit(1);

            // 2. Controls summary
            const controls = await db.select({ status: clientControls.status })
                .from(clientControls).where(dbEq(clientControls.clientId, clientId));

            const IMPLEMENTED_STATUSES = ['implemented', 'active', 'completed'];
            const total = controls.length;
            const implemented = controls.filter(c => IMPLEMENTED_STATUSES.includes(c.status || '')).length;
            const inProgress = controls.filter(c => c.status === 'in_progress').length;
            const complianceLevel = total > 0 ? Math.round((implemented / total) * 100) : 0;

            // 3. Top critical/high risks
            const criticalRisks = await db.select({
                title: riskAssessments.title,
                inherentRisk: riskAssessments.inherentRisk,
                status: riskAssessments.status,
            })
                .from(riskAssessments)
                .where(dbEq(riskAssessments.clientId, clientId))
                .orderBy(desc(riskAssessments.inherentScore))
                .limit(5);

            // 4. Expiring evidence (next 30 days)
            const now = new Date();
            const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            let expiringCount = 0;
            try {
                const expiring = await db.select({ id: evidence.id })
                    .from(evidence)
                    .where(dbAnd(
                        dbEq(evidence.clientId, clientId),
                        gte(evidence.expiresAt, now),
                        lte(evidence.expiresAt, in30Days)
                    ) as any);
                expiringCount = expiring.length;
            } catch { /* expiresAt column may not exist on all deployments */ }

            // 5. Open incidents count
            let openIncidents = 0;
            try {
                const openInc = await db.select({ id: incidents.id })
                    .from(incidents)
                    .where(dbAnd(dbEq(incidents.clientId, clientId), dbEq(incidents.status, 'open')) as any);
                openIncidents = openInc.length;
            } catch { /* incidents table may be empty */ }

            // Format context block
            const riskLines = criticalRisks.length > 0
                ? criticalRisks.map(r => `  - ${r.title} [${r.inherentRisk || 'unknown'} risk, ${r.status}]`).join('\n')
                : '  - No risks registered';

            return `

## Live Compliance Dashboard — ${org?.name || `Workspace #${clientId}`} (as of ${now.toLocaleDateString()})
- **Overall Compliance:** ${complianceLevel}% (${implemented}/${total} controls implemented, ${inProgress} in progress)
- **Open Incidents:** ${openIncidents}
- **Evidence Expiring (30 days):** ${expiringCount} items

### Top Risks (by inherent score)
${riskLines}

Use this live data to answer questions accurately. Do NOT speculate about the user's compliance posture — reference the numbers above.`;
        } catch (err) {
            console.warn('[AgentService.buildContextSnapshot] Failed to fetch context:', err);
            return ''; // Graceful degradation — LLM still responds, just without live data
        }
    }

    /**
     * Generate a system prompt part describing available tools
     */
    static async getAgentPrompt(clientId: number) {
        const tools = await this.getAvailableTools(clientId);

        let prompt = "\n\n### AGENTIC ACTIONS CAPABILITY\n";
        prompt += "You are capable of proposing actions to help the user. When you want to suggest an action (like sending a Slack message, creating a task, or updating a status), you MUST include a specific JSON block in your response.\n";
        prompt += "The user will see this as an interactive button they can click to 'Approve' or 'Execute'.\n\n";
        prompt += "Format for proposing an action:\n";
        prompt += "[[PROPOSED_ACTION: {\"type\": \"integration|core\", \"slug\": \"slug\", \"actionId\": \"id\", \"params\": {}, \"label\": \"Action Name\", \"description\": \"Short reason why\"}]]\n\n";

        // Integration Tools
        for (const service of tools.integrations) {
            prompt += `Service: ${service.name} (Slug: ${service.slug})\n`;
            for (const action of service.actions) {
                prompt += `- ${action.id}: ${action.name}. ${action.description || ''}\n`;
            }
        }

        // Core Tools
        for (const service of tools.core) {
            prompt += `Core Functions:\n`;
            for (const action of service.actions) {
                prompt += `- ${action.id}: ${action.name}. ${action.description || ''}. Params: ${JSON.stringify(action.params)}\n`;
            }
        }

        return prompt;
    }

    /**
     * Parse a response and extract proposed actions
     */
    static parseProposals(text: string): { cleanText: string; proposals: ProposedAction[] } {
        const proposals: ProposedAction[] = [];
        const regex = /\[\[PROPOSED_ACTION:\s*({.*?})\s*\]\]/g;

        let match;
        let cleanText = text;

        while ((match = regex.exec(text)) !== null) {
            try {
                const actionData = JSON.parse(match[1]);
                proposals.push({
                    id: Math.random().toString(36).substring(7),
                    ...actionData
                });
                // Remove the action block from the clean text to keep the UI clean
                cleanText = cleanText.replace(match[0], '');
            } catch (e) {
                console.error("[AgentService] Failed to parse proposed action:", e);
            }
        }

        return { cleanText: cleanText.trim(), proposals };
    }

    /**
     * Execute a proposed action
     */
    static async executeAction(clientId: number, userId: string, action: ProposedAction): Promise<IntegrationResult> {
        if (action.type === 'core') {
            return await this.executeCoreAction(clientId, userId, action);
        }

        return await this.executeIntegrationAction(clientId, userId, action);
    }

    private static async executeCoreAction(clientId: number, userId: string, action: ProposedAction): Promise<IntegrationResult> {
        const db = await getDb();
        const { id: uId } = (await db.query.users.findFirst({ where: eq((await import('../../schema')).users.openId, userId) })) || { id: 0 };

        try {
            switch (action.actionId) {
                case 'create-task': {
                    const { projectTasks } = await import('../../schema');
                    await db.insert(projectTasks).values({
                        clientId,
                        title: action.params.title,
                        description: action.params.description,
                        priority: action.params.priority || 'medium',
                        status: 'todo',
                        assigneeId: uId
                    });
                    return { success: true, timestamp: new Date(), data: { message: "Task created successfully" } };
                }
                case 'update-control-status': {
                    const { clientControls } = await import('../../schema');
                    await db.update(clientControls)
                        .set({ status: action.params.status })
                        .where(and(
                            eq(clientControls.clientId, clientId),
                            eq(clientControls.controlId, action.params.controlId)
                        ));
                    return { success: true, timestamp: new Date(), data: { message: "Control status updated" } };
                }
                default:
                    throw new Error(`Unknown core action: ${action.actionId}`);
            }
        } catch (e: any) {
            return { success: false, error: e.message, timestamp: new Date() };
        }
    }

    private static async executeIntegrationAction(clientId: number, userId: string, action: ProposedAction): Promise<IntegrationResult> {
        const db = await getDb();
        const connection = await db.query.integrations.findFirst({
            where: and(
                eq(integrationsTable.clientId, clientId),
                eq(integrationsTable.provider, action.slug),
                eq(integrationsTable.isActive, true)
            )
        });

        if (!connection) {
            throw new Error(`Integration ${action.slug} not connected or active.`);
        }

        const context: IntegrationContext = {
            connectionId: connection.id.toString(),
            userId: userId,
            organizationId: clientId.toString(),
            credentials: (connection.credentials as any) || {},
            settings: (connection.settings as any) || {}
        };

        return await integrationRegistry.execute(action.slug, action.actionId, context, action.params);
    }
}
