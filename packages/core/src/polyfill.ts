// Polyfill for Node.js environment (required by some PDF/Canvas libraries)
/** 
 * This file MUST be imported before any other module that might trigger 
 * code execution at the top level using DOM APIs.
 */

if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() { }
        static fromFloat32Array() { return new DOMMatrix(); }
        static fromFloat64Array() { return new DOMMatrix(); }
        static fromMatrix() { return new DOMMatrix(); }
    };
    console.log("[Polyfill] DOMMatrix polyfilled for Node.js environment.");
}

// Add other common browser globals if needed
if (typeof (global as any).window === 'undefined') {
    (global as any).window = global;
}
if (typeof (global as any).document === 'undefined') {
    (global as any).document = {
        createElement: () => ({ setAttribute: () => { }, style: {} }),
        getElementsByTagName: () => [],
    } as any;
}
