// Polyfill for Node.js environment (required by some PDF components)
if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() { }
        static fromFloat32Array() { return new DOMMatrix(); }
        static fromFloat64Array() { return new DOMMatrix(); }
        static fromMatrix() { return new DOMMatrix(); }
    };
}

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
