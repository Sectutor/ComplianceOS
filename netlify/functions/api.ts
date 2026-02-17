// CRITICAL: Polyfill MUST run before any other code is evaluated
(function polyfill() {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};

    // Core Graphics
    if (typeof g.DOMMatrix === 'undefined') {
        g.DOMMatrix = class DOMMatrix {
            constructor() { }
            static fromFloat32Array() { return new DOMMatrix(); }
            static fromFloat64Array() { return new DOMMatrix(); }
            static fromMatrix() { return new DOMMatrix(); }
        };
        if (typeof global !== 'undefined') (global as any).DOMMatrix = g.DOMMatrix;
    }

    // Minimal Location for libraries that expect it (like jspdf)
    // We don't define 'window' or 'self' here to avoid tricking @trpc/server
    if (typeof (g as any).location === 'undefined') {
        (g as any).location = {
            href: 'https://app.grcompliance.com/',
            origin: 'https://app.grcompliance.com',
            protocol: 'https:',
            host: 'app.grcompliance.com',
            hostname: 'app.grcompliance.com',
            pathname: '/',
            search: '',
            hash: '',
            toString: () => 'https://app.grcompliance.com/',
        };
    }
})();

const serverless = require("serverless-http");
const { app } = require("../../server_entry");

module.exports.handler = serverless(app, {
    binary: [
        'application/zip',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*',
    ]
});
