import path from "path";
import fs from "fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite';

// Auto-detect if premium package is available
const premiumPath = path.resolve(__dirname, "../premium/src");
const hasPremium = fs.existsSync(premiumPath);

console.log(`[Vite] Building with ${hasPremium ? 'Premium' : 'Open Source'} edition.`);

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@shared": path.resolve(__dirname, "../../shared"),
            "@complianceos/premium": hasPremium 
                ? premiumPath 
                : path.resolve(__dirname, "./src/mocks/premium"),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
            },
        },
    },
});
