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
    }

    // Window & self
    if (typeof g.window === 'undefined') g.window = g;
    if (typeof g.self === 'undefined') g.self = g;

    // Location & Navigator
    if (typeof g.location === 'undefined') {
        g.location = {
            href: 'https://app.grcompliance.com/',
            origin: 'https://app.grcompliance.com',
            protocol: 'https:',
            host: 'app.grcompliance.com',
            hostname: 'app.grcompliance.com',
            port: '',
            pathname: '/',
            search: '',
            hash: '',
            assign: () => { },
            replace: () => { },
            reload: () => { },
            toString: () => 'https://app.grcompliance.com/',
        };
    }
    if (typeof g.navigator === 'undefined') g.navigator = { userAgent: 'Node.js', platform: 'Node.js', languages: ['en-US'] };

    // Classes
    if (typeof g.Node === 'undefined') g.Node = class Node { };
    if (typeof g.Element === 'undefined') g.Element = class Element { };
    if (typeof g.HTMLElement === 'undefined') g.HTMLElement = class HTMLElement extends g.Element { };

    // Storage
    if (typeof g.localStorage === 'undefined') g.localStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { }, clear: () => { } };
    if (typeof g.sessionStorage === 'undefined') g.sessionStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { }, clear: () => { } };

    // NOTE: 'document' is omitted to avoid triggering browser-detection in @trpc/server
})();

const serverless = require("serverless-http");
const { app } = require("../../server_entry");

export const handler = serverless(app, {
    binary: [
        'application/zip',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*',
    ]
});
