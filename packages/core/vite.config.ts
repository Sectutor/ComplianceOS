import path from "path";
import fs from "fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite';

// Dual-licensing build configuration
// BUILD_TYPE can be: 'AGPLv3' (Community), 'COMMERCIAL' (Enterprise), or 'TRIAL'
const buildType = process.env.BUILD_TYPE || 'AGPLv3';
const forceDisablePremium = process.env.VITE_ENABLE_PREMIUM === 'false';

// Check if premium package exists on disk and is enabled
const premiumPath = path.resolve(__dirname, "../premium/src");
const hasPremium = !forceDisablePremium && fs.existsSync(premiumPath);

// Set license type for the build
const licenseType = !hasPremium ? 'AGPLv3 Community (Standalone)' :
    buildType === 'TRIAL' ? 'Commercial Trial' :
        'Commercial Enterprise';

console.log(`[Vite] Building ${licenseType} edition (Build Type: ${buildType})`);
console.log(`[Vite] Premium features: ${hasPremium ? 'ENABLED' : 'DISABLED'}`);

const devHost = process.env.VITE_HOST || '127.0.0.1';
const devPort = parseInt(process.env.VITE_PORT || process.env.PORT || '5173', 10);
const hmrProtocol = (process.env.VITE_HMR_PROTOCOL || 'ws') as 'ws' | 'wss';
const hmrClientPort = parseInt(process.env.VITE_HMR_CLIENT_PORT || String(devPort), 10);

export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        "process.env.BUILD_TYPE": JSON.stringify(buildType),
        "process.env.VITE_ENABLE_PREMIUM": JSON.stringify(process.env.VITE_ENABLE_PREMIUM || "true"),
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@complianceos/ui": path.resolve(__dirname, "../ui/src"),
            "@shared": path.resolve(__dirname, "../../shared"),
            "@complianceos/premium": hasPremium
                ? premiumPath
                : path.resolve(__dirname, "./src/mocks/premium"),
        },
    },
    server: {
        host: devHost,
        port: devPort,
        strictPort: true,
        hmr: {
            protocol: hmrProtocol,
            host: devHost,
            clientPort: hmrClientPort,
        },
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3005',
                changeOrigin: true,
                secure: false,
                timeout: parseInt(process.env.VITE_PROXY_TIMEOUT || '300000'),
                proxyTimeout: parseInt(process.env.VITE_PROXY_TIMEOUT || '300000'),
                // Add error handling for proxy errors
                configure: (proxy, _options) => {
                    const DEBUG_PROXY = process.env.DEBUG_PROXY === 'true';
                    
                    proxy.on('error', (err, req, res: any) => {
                        console.error('[Vite Proxy Error]', err.message, req.url);
                        if (res && !res.headersSent) {
                            res.writeHead(502, { 'Content-Type': 'application/json' });
                            const trpcErrorPayload = {
                                error: {
                                    message: 'Proxy Error: ' + err.message,
                                    code: -32603,
                                    data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 502 }
                                }
                            };
                            res.end(JSON.stringify([trpcErrorPayload]));
                        }
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        if (DEBUG_PROXY) console.log('[Vite Proxy Request]', req.method, req.url, '->', proxyReq.path);
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        if (DEBUG_PROXY) console.log('[Vite Proxy Response]', proxyRes.statusCode, req.url);
                    });
                },
                bypass: (req) => {
                    // Do not proxy OAuth callback routes - handle them in the frontend
                    if (req.url?.includes('/api/oauth/')) {
                        return req.url;
                    }
                }
            },
            '/uploads': {
                target: 'http://127.0.0.1:3002',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    optimizeDeps: {
        include: [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
            'date-fns',
            'wouter',
            '@tanstack/react-query',
            '@trpc/client',
            '@trpc/react-query',
            'superjson',
            'clsx',
            'tailwind-merge',
            'lucide-react',
            'sonner',
            'input-otp',
            'react-hook-form',
            'zod'
        ],
        esbuildOptions: {
            target: 'esnext',
        }
    },
    esbuild: {
        legalComments: 'none',
        treeShaking: true,
    },
    build: {
        target: 'esnext',
        chunkSizeWarningLimit: 1200,
        reportCompressedSize: false, // Saves 30-50s on build by skipping unnecessary gzip computation
        cssCodeSplit: true,
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const normId = id.replace(/\\/g, '/');
                    if (normId.includes('/node_modules/')) {
                        // Core React & Data Layer
                        if (
                            normId.includes('/node_modules/react/') || 
                            normId.includes('/node_modules/react-dom/') || 
                            normId.includes('/node_modules/scheduler/') ||
                            normId.includes('/node_modules/wouter/') ||
                            normId.includes('/node_modules/@tanstack/') ||
                            normId.includes('/node_modules/@trpc/') ||
                            normId.includes('/node_modules/superjson/')
                        ) {
                            return 'vendor-core';
                        }
                        // Material UI & Emotion
                        if (normId.includes('/node_modules/@mui/') || normId.includes('/node_modules/@emotion/')) {
                            return 'vendor-mui';
                        }
                        // Data Visualization
                        if (
                            normId.includes('/node_modules/recharts/') || 
                            normId.includes('/node_modules/d3-') || 
                            normId.includes('/node_modules/d3/') || 
                            normId.includes('/node_modules/chart.js/')
                        ) {
                            return 'vendor-charts';
                        }
                        // Heavy Export & Document Processing Split
                        if (
                            normId.includes('/node_modules/jspdf/') || 
                            normId.includes('/node_modules/html2canvas/') || 
                            normId.includes('/node_modules/html2pdf.js/') || 
                            normId.includes('/node_modules/pdfkit/')
                        ) {
                            return 'vendor-pdf';
                        }
                        if (
                            normId.includes('/node_modules/docx/') || 
                            normId.includes('/node_modules/xlsx/') || 
                            normId.includes('/node_modules/archiver/') || 
                            normId.includes('/node_modules/file-saver/')
                        ) {
                            return 'vendor-office';
                        }
                        // UI Component Kits & Icons
                        if (
                            normId.includes('/node_modules/lucide-react/') || 
                            normId.includes('/node_modules/framer-motion/')
                        ) {
                            return 'vendor-ui-icons';
                        }
                        if (normId.includes('/node_modules/@radix-ui/')) {
                            return 'vendor-radix';
                        }
                        // Rich Text Editors & Markdown
                        if (
                            normId.includes('/node_modules/quill/') || 
                            normId.includes('/node_modules/react-quill-new/') || 
                            normId.includes('/node_modules/react-markdown/') || 
                            normId.includes('/node_modules/marked/') || 
                            normId.includes('/node_modules/turndown/')
                        ) {
                            return 'vendor-editor';
                        }
                        // Drag and Drop
                        if (normId.includes('/node_modules/@dnd-kit/')) {
                            return 'vendor-dnd';
                        }
                    }
                }
            }
        }
    }
});
