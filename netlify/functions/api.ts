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

    // Minimal Location for libraries that expect it
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

    console.log("Environment check:", {
        process_defined: typeof process !== 'undefined',
        env_defined: typeof process !== 'undefined' && !!process.env,
        window_defined: typeof (g as any).window !== 'undefined',
        self_defined: typeof (g as any).self !== 'undefined',
        document_defined: typeof (g as any).document !== 'undefined'
    });
})();

const serverless = require("serverless-http");

let app;
try {
    app = require("../../server_entry").app;
} catch (e) {
    console.error("FAILED TO LOAD APP:", e);
    exports.handler = async (event: any, context: any) => {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Failed to load application",
                message: e.message,
                stack: e.stack,
                env: {
                    NODE_ENV: process.env.NODE_ENV,
                    NETLIFY: process.env.NETLIFY,
                    window: typeof (global as any).window
                }
            })
        };
    };
}

if (app) {
    exports.handler = serverless(app, {
        binary: [
            'application/zip',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/*',
        ]
    });
}
