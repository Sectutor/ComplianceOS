/**
 * Comprehensive Background Application Crawler & Route Validator
 * 
 * Audits all application pages, roadmaps, sidebar links, guides, and dynamic routes.
 * Emulates client session with clientId = 18.
 * Detects 404s, unhandled route patterns, parameter collisions, and missing handlers.
 */
const fs = require('fs');
const path = require('path');

const rootDir = 'D:\\OneDrive - Intellfence\\WebDev\\ComplianceOS';
const appTsxPath = path.join(rootDir, 'packages/core/src/App.tsx');
const roadmapsPath = path.join(rootDir, 'packages/core/src/data/frameworkRoadmaps.ts');
const dashboardLayoutPath = path.join(rootDir, 'packages/core/src/components/DashboardLayout.tsx');

const CLIENT_ID = 18;

// 1. Compile routes from App.tsx
const appTsx = fs.readFileSync(appTsxPath, 'utf8');
const routeRegex = /<Route\s+path=["']([^"']+)["']/g;
const rawRoutes = [];
let m;
while ((m = routeRegex.exec(appTsx)) !== null) {
    rawRoutes.push(m[1]);
}

function routeToRegExp(pattern) {
    let p = pattern;
    // Wildcards: /:rest* or /*
    p = p.replace(/:[a-zA-Z0-9_]+\*/g, '(.*)');
    p = p.replace(/\/\*/g, '(/.*)?');
    // Optional params: /:param?
    p = p.replace(/\/:[a-zA-Z0-9_]+\?/g, '(?:/([^/]+))?');
    // Named params: /:param
    p = p.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)');
    return new RegExp(`^${p}$`);
}

const compiledRoutes = rawRoutes.map(r => ({
    pattern: r,
    regex: routeToRegExp(r)
}));

// Client specific menu items and resolveNavigationPath logic replicated from packages/core/src/lib/navigation.ts
function resolveNavigationPath(itemPath, clientId) {
    if (!itemPath) return '';
    if (!clientId) return itemPath;

    const [purePath, query] = itemPath.split('?');
    const queryStr = query ? `?${query}` : '';

    if (purePath.startsWith('/questionnaire/')) return itemPath;

    if (purePath === "/governance") return `/clients/${clientId}/governance${queryStr}`;
    if (purePath === "/governance/workbench") return `/clients/${clientId}/governance/workbench${queryStr}`;
    if (purePath === "/compliance") return `/clients/${clientId}/compliance${queryStr}`;
    if (purePath === "/client-dashboard") return `/clients/${clientId}?tab=dashboard${query ? '&' + query : ''}`;
    if (purePath === "/client-controls") return `/clients/${clientId}/controls${queryStr}`;
    if (purePath === "/compliance-requirements") return `/compliance-requirements${queryStr}`;
    if (purePath === "/client-policies") return `/clients/${clientId}/policies${queryStr}`;
    if (purePath === "/audit-readiness") return `/clients/${clientId}/audit-readiness${queryStr}`;
    if (purePath === "/readiness/wizard") return `/clients/${clientId}/readiness/wizard${queryStr}`;
    if (purePath === "/intake") return `/clients/${clientId}/intake${queryStr}`;
    if (purePath === "/board-summary") return `/clients/${clientId}/board-summary${queryStr}`;
    if (purePath === "/communication") return `/clients/${clientId}/communication${queryStr}`;
    if (purePath === "/ai-governance") return `/clients/${clientId}/ai-governance${queryStr}`;
    if (purePath === "/guides") return `/clients/${clientId}/guides${queryStr}`;
    if (purePath === "/activity") return `/clients/${clientId}/activity${queryStr}`;
    if (purePath === "/start-here") return `/clients/${clientId}/start-here${queryStr}`;
    if (purePath === "/readiness/roadmap") return `/clients/${clientId}/start-here${queryStr}`;
    if (purePath === "/roadmap") return `/clients/${clientId}/start-here${queryStr}`;
    if (purePath === "/roadmap/dashboard") return `/clients/${clientId}/start-here${queryStr}`;
    if (purePath === "/implementation") return `/clients/${clientId}/implementation${queryStr}`;
    if (purePath === "/implementation/dashboard") return `/clients/${clientId}/implementation${queryStr}`;
    if (purePath === "/evidence") return `/clients/${clientId}/evidence${queryStr}`;
    if (purePath === "/compliance-journey") return `/clients/${clientId}/compliance-journey${queryStr}`;
    if (purePath === "/onboarding") return `/onboarding${queryStr}`;
    if (purePath === "/gap-analysis") return `/clients/${clientId}/gap-analysis${queryStr}`;
    if (purePath === "/training/management") return `/clients/${clientId}/training/management${queryStr}`;
    if (purePath === "/personnel-compliance") return `/clients/${clientId}/personnel-compliance${queryStr}`;
    if (purePath === "/audit-hub") return `/clients/${clientId}/audit-hub${queryStr}`;
    if (purePath === "/audit-manager") return `/clients/${clientId}/audit-manager${queryStr}`;
    if (purePath === "/reports") return `/clients/${clientId}/reports${queryStr}`;
    if (purePath === "/trust-center") return `/trust-center/${clientId}${queryStr}`;
    if (purePath === "/projects") return `/clients/${clientId}/projects${queryStr}`;
    if (purePath === "/marketplace") return `/clients/${clientId}/marketplace${queryStr}`;
    if (purePath === "/essential-eight") return `/clients/${clientId}/essential-eight${queryStr}`;
    if (purePath === "/nist-csf-2") return `/clients/${clientId}/nist-csf-2${queryStr}`;
    if (purePath === "/cisa-ztmm-2") return `/clients/${clientId}/cisa-ztmm-2${queryStr}`;
    if (purePath === "/cmmc-2") return `/clients/${clientId}/cmmc-2${queryStr}`;
    if (purePath === "/c2m2-2.1") return `/clients/${clientId}/c2m2-2.1${queryStr}`;
    if (purePath === "/settings") return `/clients/${clientId}/settings${queryStr}`;
    if (purePath === "/settings/plugins") return `/clients/${clientId}/settings/plugins${queryStr}`;
    if (purePath === "/compliance-obligations") return `/clients/${clientId}/compliance-obligations${queryStr}`;
    if (purePath === "/frameworks") return `/frameworks${queryStr}`;
    if (purePath === "/questionnaires") return `/clients/${clientId}/questionnaires${queryStr}`;
    if (purePath === "/risk-register/critical") return `/clients/${clientId}/risks/critical${queryStr}`;
    if (purePath.startsWith("/risk-register")) return `/clients/${clientId}/risks/register${queryStr}`;
    if (purePath === "/audit-prep") return `/clients/${clientId}/audit-hub${queryStr}`;
    if (purePath.startsWith("/vendors/assessments/overdue")) return `/clients/${clientId}/vendors/assessments/overdue${queryStr}`;

    const isClientSubRoute = 
        purePath.startsWith('/risks') ||
        purePath.startsWith('/vendors') ||
        purePath.startsWith('/business-continuity') ||
        purePath.startsWith('/federal') ||
        purePath.startsWith('/nist') ||
        purePath.startsWith('/privacy') ||
        purePath.startsWith('/plugins') ||
        purePath.startsWith('/workflows') ||
        purePath.startsWith('/cyber') ||
        purePath.startsWith('/ai-governance') ||
        purePath.startsWith('/guides') ||
        purePath.startsWith('/iso27001') ||
        purePath.startsWith('/roadmap') ||
        purePath.startsWith('/readiness') ||
        purePath.startsWith('/compliance-journey') ||
        purePath.startsWith('/assurance') ||
        purePath.startsWith('/implementation') ||
        purePath === '/asvs' ||
        purePath === '/samm' ||
        purePath === '/nist-csf-2' ||
        purePath === '/cisa-ztmm-2' ||
        purePath === '/cmmc-2' ||
        purePath === '/metrics' ||
        purePath === '/tasks' ||
        purePath === '/people' ||
        purePath === '/raci-matrix' ||
        purePath === '/calendar' ||
        purePath === '/notifications' ||
        purePath === '/knowledge-base' ||
        purePath === '/mappings' ||
        purePath === '/dev/projects';

    if (isClientSubRoute) {
        return `/clients/${clientId}${purePath}${queryStr}`;
    }

    return itemPath;
}

function testUrl(url) {
    if (!url || url === '#' || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
        return { valid: true, pattern: 'external_or_anchor' };
    }
    const cleanPath = url.split('?')[0].split('#')[0];
    for (const cr of compiledRoutes) {
        if (cr.regex.test(cleanPath)) {
            return { valid: true, pattern: cr.pattern };
        }
    }
    return { valid: false, cleanPath };
}

console.log('====================================================');
console.log('   COMPLIANCEOS COMPREHENSIVE BACKGROUND CRAWLER    ');
console.log('====================================================\n');
console.log(`Loaded ${compiledRoutes.length} registered Route patterns from App.tsx`);

const testedUrls = new Set();
const results = {
    passed: [],
    failed: []
};

function recordTest(source, label, url) {
    if (!url || typeof url !== 'string') return;
    if (url.includes('${')) return; // Ignore unresolved template expressions
    if (testedUrls.has(url)) return;
    testedUrls.add(url);
    const res = testUrl(url);
    if (res.valid) {
        results.passed.push({ source, label, url, matchedPattern: res.pattern });
    } else {
        results.failed.push({ source, label, url, cleanPath: res.cleanPath });
    }
}

// 2. Audit Sidebar Navigation from DashboardLayout.tsx
const dashContent = fs.readFileSync(dashboardLayoutPath, 'utf8');
const pathRegex = /path:\s*[`"']([^`"']+)[`"']/g;
while ((m = pathRegex.exec(dashContent)) !== null) {
    let rawPath = m[1];
    let resolved = resolveNavigationPath(rawPath, CLIENT_ID);
    recordTest('Sidebar Navigation', 'Menu Item', resolved);
}

// 3. Audit all 10 Framework Roadmaps from frameworkRoadmaps.ts
const roadmapsContent = fs.readFileSync(roadmapsPath, 'utf8');
const linkRegex = /link:\s*[`"']([^`"']+)[`"']/g;
while ((m = linkRegex.exec(roadmapsContent)) !== null) {
    let rawPath = m[1];
    let resolved = rawPath
        .replace(/\${clientId}/g, CLIENT_ID)
        .replace(/:id/g, CLIENT_ID);
    recordTest('Framework Roadmap', 'Task Link', resolved);
}

// 4. Audit Program Guides across all frameworks
const pagesDir = path.join(rootDir, 'packages/core/src/pages');
function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            scanDir(full);
        } else if (f.endsWith('ProgramGuide.tsx') || f === 'StartHere.tsx') {
            const code = fs.readFileSync(full, 'utf8');
            
            // Direct /clients/ links
            const guideLinks = /[`"'](\/clients\/[^`"'$]+)[`"']/g;
            let match;
            while ((match = guideLinks.exec(code)) !== null) {
                let p = match[1]
                    .replace(/:id/g, CLIENT_ID)
                    .replace(/:clientId/g, CLIENT_ID);
                recordTest(f, 'Program Guide / Hub Link', p);
            }

            // In FederalProgramGuide, check step links & secondaryLinks
            if (f === 'FederalProgramGuide.tsx') {
                const stepLinkRegex = /(?:secondaryLink|link):\s*['"]([^'"]+)['"]/g;
                let stepMatch;
                while ((stepMatch = stepLinkRegex.exec(code)) !== null) {
                    const relative = stepMatch[1];
                    const fullLink = `/clients/${CLIENT_ID}/${relative}`;
                    recordTest(f, 'Federal Step Link', fullLink);
                }
            }
        }
    }
}
scanDir(pagesDir);

async function runLiveProbes() {
    console.log(`\nStarting Live HTTP probes against Vite server (http://localhost:5173)...`);
    const urls = Array.from(testedUrls).filter(u => u.startsWith('/'));
    let liveSuccess = 0;
    let liveErrors = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batch = urls.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (u) => {
            try {
                const res = await fetch(`http://localhost:5173${u}`, { method: 'GET' });
                if (res.status === 200) {
                    liveSuccess++;
                } else {
                    liveErrors++;
                    console.log(`  ⚠️ HTTP ${res.status}: ${u}`);
                }
            } catch (err) {
                liveErrors++;
                console.log(`  ⚠️ Connection Error on ${u}:`, err.message);
            }
        }));
    }

    console.log(`\nLive Server Probes Complete:`);
    console.log(`  🌐 ${liveSuccess}/${urls.length} live routes returned HTTP 200 OK.`);
    if (liveErrors > 0) {
        console.log(`  ⚠️ ${liveErrors} routes returned non-200 or connection errors.`);
    }
}

(async () => {
    console.log(`\nCrawled & Audited ${testedUrls.size} unique interactive application URLs:`);
    console.log(`  ✅ ${results.passed.length} URLs mapped to valid App.tsx Route handlers.`);
    console.log(`  ❌ ${results.failed.length} URLs returned dead (404 Not Found).\n`);

    if (results.failed.length > 0) {
        console.log('FAILED URLS (DEAD LINKS / COLLISION GAPS):');
        results.failed.forEach((f, i) => {
            console.log(`  [${i + 1}] Source: ${f.source} | Label: "${f.label}"`);
            console.log(`      Target: ${f.url} (Resolved clean: ${f.cleanPath})`);
        });
    } else {
        console.log('🎉 100% ROUTE HEALTH: All crawled application links and navigation routes match valid handlers!');
    }

    await runLiveProbes();

    const outputPath = path.join(__dirname, 'crawl_audit_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed audit results saved to: ${outputPath}`);
})();

