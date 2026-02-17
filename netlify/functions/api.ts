// CRITICAL: Polyfill MUST run before any other code is evaluated
(function polyfill() {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
    if (typeof g.DOMMatrix === 'undefined') {
        g.DOMMatrix = class DOMMatrix {
            constructor() { }
            static fromFloat32Array() { return new DOMMatrix(); }
            static fromFloat64Array() { return new DOMMatrix(); }
            static fromMatrix() { return new DOMMatrix(); }
        };
    }
    if (typeof g.window === 'undefined') g.window = g;
    if (typeof g.document === 'undefined') {
        g.document = {
            createElement: () => ({ setAttribute: () => { }, style: {}, appendChild: () => { } }),
            getElementsByTagName: () => [],
            documentElement: { style: {} },
            addEventListener: () => { },
            removeEventListener: () => { },
        };
    }
    if (typeof g.navigator === 'undefined') g.navigator = { userAgent: 'Node.js' };
    if (typeof g.location === 'undefined') g.location = { href: '', origin: '' };
})();

import serverless from "serverless-http";
import { app } from "../../server_entry";

export const handler = serverless(app, {
    binary: [
        'application/zip',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*',
    ]
});
