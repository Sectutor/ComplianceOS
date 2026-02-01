import { config } from 'dotenv';
import { getDb } from '../packages/core/src/db.js';
import { devProjects, threatModels, threatModelComponents, threatModelDataFlows } from '../packages/core/src/schema.js';
import { eq } from 'drizzle-orm';

config();

async function seedPASTADemo() {
    console.log('🎯 Creating PASTA Threat Model Demo for Client 3...\n');

    const dbConn = await getDb();
    const clientId = 3;

    // 1. Create a Dev Project
    console.log('📦 Creating E-Commerce Platform project...');
    const [project] = await dbConn.insert(devProjects).values({
        clientId,
        name: 'E-Commerce Platform - Customer Portal',
        description: 'Customer-facing e-commerce platform for online shopping with payment processing, user authentication, and order management.',
        status: 'active',
        lead: 'Sarah Johnson',
        startDate: new Date('2024-01-15'),
        targetDate: new Date('2024-06-30'),
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    console.log(`✅ Created project: ${project.name} (ID: ${project.id})\n`);

    // 2. Create PASTA Threat Model
    console.log('🔒 Creating PASTA Threat Model...');
    const [model] = await dbConn.insert(threatModels).values({
        clientId,
        devProjectId: project.id,
        name: 'E-Commerce Platform - PASTA Analysis',
        methodology: 'PASTA',
        description: 'Risk-centric threat modeling for the e-commerce customer portal, focusing on payment data protection and user privacy',
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    console.log(`✅ Created PASTA threat model: ${model.name} (ID: ${model.id})\n`);

    // 3. Add Architecture Components
    console.log('🏗️  Adding architecture components...');

    const components = [
        // External actors
        { name: 'Customer', type: 'Actor', description: 'End user shopping on the platform', x: 50, y: 100 },
        { name: 'Admin User', type: 'Actor', description: 'Platform administrator', x: 50, y: 300 },

        // Frontend
        { name: 'Web Client', type: 'Web Client', description: 'React-based customer portal', x: 250, y: 100 },
        { name: 'Admin Dashboard', type: 'Web Client', description: 'Admin management interface', x: 250, y: 300 },

        // API Layer
        { name: 'REST API Gateway', type: 'API', description: 'API Gateway with rate limiting', x: 500, y: 150 },
        { name: 'GraphQL API', type: 'API', description: 'GraphQL endpoint for product catalog', x: 500, y: 250 },

        // Authentication
        { name: 'Auth Service', type: 'Authentication Service', description: 'JWT-based authentication with OAuth2', x: 750, y: 50 },

        // Business Logic
        { name: 'Order Service', type: 'Process', description: 'Handles order creation and management', x: 750, y: 150 },
        { name: 'Payment Service', type: 'Process', description: 'Processes payments via Stripe', x: 750, y: 250 },
        { name: 'Inventory Service', type: 'Process', description: 'Manages product inventory', x: 750, y: 350 },

        // Data Stores
        { name: 'User Database', type: 'Database', description: 'PostgreSQL - User profiles and credentials', x: 1000, y: 50 },
        { name: 'Orders Database', type: 'Database', description: 'PostgreSQL - Order and transaction data', x: 1000, y: 150 },
        { name: 'Product Database', type: 'Database', description: 'PostgreSQL - Product catalog', x: 1000, y: 250 },
        { name: 'Session Store', type: 'Database', description: 'Redis - Session and cache data', x: 1000, y: 350 },

        // External Services
        { name: 'Stripe API', type: 'External Service', description: 'Payment processing provider', x: 1000, y: 450 },
        { name: 'Email Service', type: 'External Service', description: 'SendGrid for transactional emails', x: 750, y: 550 },
        { name: 'CDN', type: 'External Service', description: 'CloudFlare for static assets', x: 500, y: 450 },
    ];

    const createdComponents = [];
    for (const comp of components) {
        const [created] = await dbConn.insert(threatModelComponents).values({
            threatModelId: model.id,
            ...comp,
        }).returning();
        createdComponents.push(created);
        console.log(`  ✓ Added: ${comp.name} (${comp.type})`);
    }

    console.log(`✅ Added ${createdComponents.length} components\n`);

    // 4. Add Data Flows
    console.log('🔄 Adding data flows...');

    const flows = [
        // Customer flows
        { from: 'Customer', to: 'Web Client', protocol: 'HTTPS', description: 'User interaction', isEncrypted: true },
        { from: 'Web Client', to: 'REST API Gateway', protocol: 'HTTPS', description: 'API requests', isEncrypted: true },
        { from: 'Web Client', to: 'CDN', protocol: 'HTTPS', description: 'Static assets', isEncrypted: true },

        // Admin flows
        { from: 'Admin User', to: 'Admin Dashboard', protocol: 'HTTPS', description: 'Admin actions', isEncrypted: true },
        { from: 'Admin Dashboard', to: 'REST API Gateway', protocol: 'HTTPS', description: 'Admin API calls', isEncrypted: true },

        // API flows
        { from: 'REST API Gateway', to: 'Auth Service', protocol: 'gRPC', description: 'Token validation', isEncrypted: true },
        { from: 'REST API Gateway', to: 'Order Service', protocol: 'HTTP', description: 'Order operations', isEncrypted: false },
        { from: 'REST API Gateway', to: 'Payment Service', protocol: 'HTTP', description: 'Payment requests', isEncrypted: false },

        // GraphQL flows
        { from: 'Web Client', to: 'GraphQL API', protocol: 'HTTPS', description: 'Product queries', isEncrypted: true },
        { from: 'GraphQL API', to: 'Product Database', protocol: 'PostgreSQL', description: 'Product data', isEncrypted: true },
        { from: 'GraphQL API', to: 'Inventory Service', protocol: 'HTTP', description: 'Inventory checks', isEncrypted: false },

        // Auth flows
        { from: 'Auth Service', to: 'User Database', protocol: 'PostgreSQL', description: 'User credentials', isEncrypted: true },
        { from: 'Auth Service', to: 'Session Store', protocol: 'Redis', description: 'Session data', isEncrypted: true },

        // Business logic flows
        { from: 'Order Service', to: 'Orders Database', protocol: 'PostgreSQL', description: 'Order persistence', isEncrypted: true },
        { from: 'Order Service', to: 'Payment Service', protocol: 'HTTP', description: 'Payment initiation', isEncrypted: false },
        { from: 'Order Service', to: 'Email Service', protocol: 'HTTPS', description: 'Order confirmations', isEncrypted: true },

        { from: 'Payment Service', to: 'Stripe API', protocol: 'HTTPS', description: 'Payment processing', isEncrypted: true },
        { from: 'Payment Service', to: 'Orders Database', protocol: 'PostgreSQL', description: 'Payment records', isEncrypted: true },

        { from: 'Inventory Service', to: 'Product Database', protocol: 'PostgreSQL', description: 'Stock updates', isEncrypted: true },
    ];

    // Create a map of component names to IDs
    const componentMap = new Map(createdComponents.map(c => [c.name, c.id]));

    let flowCount = 0;
    for (const flow of flows) {
        const sourceId = componentMap.get(flow.from);
        const targetId = componentMap.get(flow.to);

        if (sourceId && targetId) {
            await dbConn.insert(threatModelDataFlows).values({
                threatModelId: model.id,
                sourceComponentId: sourceId,
                targetComponentId: targetId,
                protocol: flow.protocol,
                description: flow.description,
                isEncrypted: flow.isEncrypted,
            });
            flowCount++;
            console.log(`  ✓ ${flow.from} → ${flow.to} (${flow.protocol})`);
        }
    }

    console.log(`✅ Added ${flowCount} data flows\n`);

    // 5. Display PASTA Context Information
    console.log('📋 PASTA Methodology Context:\n');

    console.log('🎯 Stage I - Business Objectives (Sample):');
    console.log('  • Achieve 99.9% uptime for customer transactions');
    console.log('  • Process payments securely with PCI-DSS compliance');
    console.log('  • Protect customer PII under GDPR requirements');
    console.log('  • Maintain customer trust through transparent security\n');

    console.log('🔒 Stage I - Security Objectives (Sample):');
    console.log('  • Prevent unauthorized access to customer accounts');
    console.log('  • Protect payment card data in transit and at rest');
    console.log('  • Ensure integrity of order and transaction data');
    console.log('  • Maintain audit trail for compliance\n');

    console.log('📜 Stage I - Compliance Requirements (Sample):');
    console.log('  • PCI-DSS v4.0 - Payment Card Industry Data Security');
    console.log('  • GDPR Article 32 - Security of Processing');
    console.log('  • GDPR Article 33 - Breach Notification');
    console.log('  • SOC 2 Type II - Security and Availability\n');

    console.log('🏗️  Stage II - Technical Scope:');
    console.log('  Applications:');
    console.log('    • Customer Web Portal (React SPA)');
    console.log('    • Admin Dashboard (React Admin)');
    console.log('  Infrastructure:');
    console.log('    • AWS EC2 (API Services)');
    console.log('    • AWS RDS PostgreSQL (Databases)');
    console.log('    • AWS ElastiCache Redis (Session Store)');
    console.log('    • CloudFlare CDN (Static Assets)');
    console.log('  Critical Data Assets:');
    console.log('    • Customer PII (Name, Email, Address)');
    console.log('    • Payment Card Data (Tokenized)');
    console.log('    • Order History and Transaction Records');
    console.log('  External Dependencies:');
    console.log('    • Stripe Payment Gateway');
    console.log('    • SendGrid Email Service');
    console.log('    • CloudFlare CDN\n');

    console.log('🔍 Stage III - Decomposition:');
    console.log('  Trust Boundaries:');
    console.log('    • Internet/DMZ - Public-facing services');
    console.log('    • DMZ/Internal - API Gateway to backend services');
    console.log('    • Internal/Data - Backend services to databases');
    console.log('  Entry/Exit Points:');
    console.log('    • HTTPS Endpoint /api/v1/* (Port 443)');
    console.log('    • GraphQL Endpoint /graphql (Port 443)');
    console.log('    • Admin API /admin/* (Port 443, IP restricted)\n');

    console.log('👤 Stage IV - Threat Actors (Sample):');
    console.log('  • External Hacker - Financial gain via payment data theft (High capability)');
    console.log('  • Insider Threat - Disgruntled employee with database access (Medium capability)');
    console.log('  • Competitor - Business intelligence gathering (Medium capability)');
    console.log('  • Script Kiddie - Opportunistic attacks (Low capability)\n');

    console.log('⚠️  Stage IV - Threat Scenarios (Sample):');
    console.log('  • Attacker exploits SQL injection to access customer database');
    console.log('  • Man-in-the-middle attack on unencrypted internal API calls');
    console.log('  • Session hijacking via XSS vulnerability in web client');
    console.log('  • Brute force attack on admin authentication endpoint');
    console.log('  • API rate limit bypass leading to DDoS\n');

    console.log('🐛 Stages V-VII are integrated with the threat analysis workflow\n');

    console.log('✅ PASTA Demo Complete!\n');
    console.log('📍 Next Steps:');
    console.log(`  1. Navigate to: Client 3 → Threat Modeling → ${project.name}`);
    console.log(`  2. View the threat model: ${model.name}`);
    console.log('  3. Complete the PASTA stages in the UI');
    console.log('  4. Use the visual canvas to see the architecture');
    console.log('  5. Generate and analyze threats\n');

    console.log(`🎯 Project ID: ${project.id}`);
    console.log(`🔒 Threat Model ID: ${model.id}`);

    process.exit(0);
}

seedPASTADemo().catch((error) => {
    console.error('❌ Error seeding PASTA demo:', error);
    process.exit(1);
});
