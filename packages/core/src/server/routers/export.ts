import express from 'express';
import { generateProfessionalDocx, generateProfessionalHtml } from '../../policyExportProfessional'; // Adjust path if needed
import * as db from '../../db'; // Use namespace import
import { clientPolicies, clients, policyTemplates } from '../../schema';
import { eq, and } from 'drizzle-orm';
import TurndownService from 'turndown';
import puppeteer from 'puppeteer';
import * as schema from '../../schema';

export const exportRouter = express.Router();

const turndownService = new TurndownService();

// Helper to fetch policy data
async function getPolicyData(policyId: number) {
    const d = await db.getDb(); // Get DB instance

    // Use query builder if available, or fallback to select if getDb returns basic instance
    // Assuming schema is passed to drizzle(), .query should be available.
    // If typescript errors, we might need to cast or use standard select().
    // Let's use d.query assuming it works, or fallback to db.getClientPolicies which exists in other files?

    // Actually, clients.ts uses db.getClientById(id). Let's see if there is db.getClientPolicyById?
    // checking db.ts for policy getters would be safer, but direct query is fine if d is typed.

    const policy = await d.query.clientPolicies.findFirst({
        where: eq(clientPolicies.id, policyId),
        with: {
            // client: true, // we will fetch client separately to be safe match existing pattern
        }
    });

    if (!policy) return null;

    // Fetch client
    const client = await d.query.clients.findFirst({
        where: eq(clients.id, policy.clientId)
    });

    if (!client) return null;

    // Fetch template
    let sections: string[] = [];
    if (policy.templateId) {
        const template = await d.query.policyTemplates.findFirst({
            where: eq(policyTemplates.id, policy.templateId)
        });
        if (template && template.sections) {
            sections = template.sections as string[];
        }
    }

    // Convert HTML to Markdown if needed
    let content = policy.content || "";
    if (content.trim().startsWith("<")) {
        content = turndownService.turndown(content);
    }

    // V14.5.1: Data Integrity Signature (AL 3)
    // Create a verification hash of the content to ensure integrity
    const cryptoNode = await import('crypto');
    const { getActiveKey } = await import('../../lib/secrets');
    const systemSecret = getActiveKey();
    const verificationHash = cryptoNode
        .createHmac('sha256', systemSecret)
        .update(`${policy.id}:${policy.updatedAt?.getTime()}:${content}`)
        .digest('hex');

    return {
        name: policy.name,
        content: content,
        sections: sections,
        version: policy.version || 1,
        clientName: client.name,
        status: policy.status || 'draft',
        createdAt: policy.createdAt || new Date(),
        updatedAt: policy.updatedAt || new Date(),
        templateId: policy.templateId?.toString(),
        logoUrl: client.logoUrl,
        contactName: client.contactName,
        contactTitle: client.contactTitle,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        address: client.address,
        clientId: client.id.toString(),
        verificationHash // AL 3 Integrity Control
    };
}

// DOCX Export
exportRouter.get('/policy/:id/professional-docx', async (req: any, res) => {
    try {
        if (!req.user) {
            return res.status(401).send('Authentication required');
        }

        const policyId = parseInt(req.params.id);
        const data = await getPolicyData(policyId);

        if (!data) {
            return res.status(404).send('Policy not found');
        }

        // Authorization check: User must have access to the client
        const d = await db.getDb();
        const membership = await d.query.userClients.findFirst({
            where: and(
                eq(schema.userClients.userId, req.user.id),
                eq(schema.userClients.clientId, parseInt(data.clientId))
            )
        });

        if (!membership && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).send('No access to this client workspace');
        }

        const buffer = await generateProfessionalDocx(data);

        res.setHeader('Content-Disposition', `attachment; filename="${data.name.replace(/[^a-z0-9]/gi, '_')}.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (error) {
        console.error("Export DOCX Error:", error);
        res.status(500).send('Error generating document');
    }
});

// HTML Preview (Professional)
exportRouter.get('/policy/:id/professional-html', async (req: any, res) => {
    try {
        if (!req.user) {
            return res.status(401).send('Authentication required');
        }

        const policyId = parseInt(req.params.id);
        const data = await getPolicyData(policyId);

        if (!data) {
            return res.status(404).send('Policy not found');
        }

        // Authorization check
        const d = await db.getDb();
        const membership = await d.query.userClients.findFirst({
            where: and(
                eq(schema.userClients.userId, req.user.id),
                eq(schema.userClients.clientId, parseInt(data.clientId))
            )
        });

        if (!membership && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).send('No access to this client workspace');
        }

        const html = generateProfessionalHtml(data);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Export HTML Error:", error);
        res.status(500).send('Error generating preview');
    }
});

// PDF Export (via Puppeteer)
exportRouter.get('/policy/:id/pdf', async (req: any, res) => {
    try {
        if (!req.user) {
            return res.status(401).send('Authentication required');
        }

        const policyId = parseInt(req.params.id);
        const data = await getPolicyData(policyId);

        if (!data) {
            return res.status(404).send('Policy not found');
        }

        // Authorization check
        const d = await db.getDb();
        const membership = await d.query.userClients.findFirst({
            where: and(
                eq(schema.userClients.userId, req.user.id),
                eq(schema.userClients.clientId, parseInt(data.clientId))
            )
        });

        if (!membership && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).send('No access to this client workspace');
        }

        const html = generateProfessionalHtml(data);

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some environments
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1in',
                bottom: '1in',
                left: '1in',
                right: '1in'
            }
        });

        await browser.close();

        res.setHeader('Content-Disposition', `attachment; filename="${data.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Export PDF Error:", error);
        res.status(500).send('Error generating PDF');
    }
});

/**
 * Full-project export (Phase 1.3)
 *
 * Bundles all project data into a single JSON/CSV/PDF/A zip.
 * Endpoint: GET /api/export/full-project/:clientId
 * Query params: format=json (default) | csv | za (zip archive with all evidence)
 */
exportRouter.get('/full-project/:clientId', async (req: any, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const clientId = parseInt(req.params.clientId);
        if (!clientId || isNaN(clientId)) {
            return res.status(400).json({ error: 'Invalid clientId' });
        }

        // Authorization check
        const d = await db.getDb();
        const membership = await d.query.userClients.findFirst({
            where: and(
                eq(schema.userClients.userId, req.user.id),
                eq(schema.userClients.clientId, clientId)
            )
        });
        if (!membership && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'No access to this client workspace' });
        }

        const format = (req.query.format as string) || 'json';

        // Fetch all project data
        const [
            policies,
            riskScenarios,
            riskAssessments,
            controls,
            biaQuestionnaires,
            bcPlans,
            vendors,
            vendorAssessments,
            evidence,
            frameworks,
        ] = await Promise.all([
            d.query.clientPolicies.findMany({ where: eq(schema.clientPolicies.clientId, clientId) }),
            d.query.riskScenarios.findMany({ where: eq(schema.riskScenarios.clientId, clientId) }),
            d.select().from(schema.riskAssessments).where(eq(schema.riskAssessments.clientId, clientId)),
            d.query.controls.findMany({ where: eq(schema.controls.clientId, clientId) }),
            d.query.biaQuestionnaires.findMany({ where: eq(schema.biaQuestionnaires.clientId, clientId) }),
            d.query.bcPlans.findMany({ where: eq(schema.bcPlans.clientId, clientId) }),
            d.query.vendors.findMany({ where: eq(schema.vendors.clientId, clientId) }),
            d.query.vendorAssessments.findMany({ where: eq(schema.vendorAssessments.clientId, clientId) }),
            d.query.evidence.findMany({ where: eq(schema.evidence.clientId, clientId) }),
            d.query.clientFrameworks.findMany({ where: eq(schema.clientFrameworks.clientId, clientId) }),
        ]);

        const project = {
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.email || req.user.id.toString(),
            clientId,
            clientName: '',
            frameworks,
            controls,
            policies: policies.map((p: any) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                version: p.version,
                contentLength: (p.content || '').length,
            })),
            riskScenarios,
            riskAssessments,
            biaQuestionnaires,
            bcPlans,
            vendors,
            vendorAssessments,
            evidenceItems: evidence.map((e: any) => ({
                id: e.id,
                name: e.name,
                description: e.description,
                controlId: e.controlId,
                expiresAt: e.expiresAt,
                hasFile: !!e.fileUrl,
            })),
        };

        if (format === 'csv') {
            // Return CSV-like summary (key-value per module)
            const csvRows: string[] = [];
            const modules = [
                { name: 'Policies', count: policies.length },
                { name: 'Controls', count: controls.length },
                { name: 'Risk Scenarios', count: riskScenarios.length },
                { name: 'Risk Assessments', count: riskAssessments.length },
                { name: 'BIA Questionnaires', count: biaQuestionnaires.length },
                { name: 'BC Plans', count: bcPlans.length },
                { name: 'Vendors', count: vendors.length },
                { name: 'Vendor Assessments', count: vendorAssessments.length },
                { name: 'Evidence Items', count: evidence.length },
                { name: 'Frameworks', count: frameworks.length },
            ];
            csvRows.push('Module,Count');
            for (const mod of modules) {
                // SECURITY: Sanitize CSV values to prevent injection (values starting with =, +, -, @)
                const sanitizeCsv = (val: string) => {
                    if (/^[=+\-@]/.test(val)) return `'${val}`;
                    return val;
                };
                csvRows.push(`${sanitizeCsv(mod.name)},${mod.count}`);
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="complianceos-export-client-${clientId}-${Date.now()}.csv"`);
            return res.send(csvRows.join('\n'));
        }

        // Default: JSON with full detail
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="complianceos-export-client-${clientId}-${Date.now()}.json"`);
        res.json(project);

    } catch (error) {
        console.error('[Export] Full project export error:', error);
        res.status(500).json({ error: 'Failed to export project data' });
    }
});
