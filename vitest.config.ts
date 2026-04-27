
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './packages/core/vite.config';

export default mergeConfig(viteConfig, defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./test/setup.ts', './packages/core/src/test/setup.ts'],
        css: true,
        testTimeout: 10000,
        include: ['packages/core/src/lib/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            reportsDirectory: './coverage',
            include: [
                'packages/core/src/lib/riskCalculations.ts',
                'packages/core/src/lib/planLimits.ts',
                'packages/core/src/lib/envValidation.ts',
                'packages/core/src/lib/risk-quant/matrix.ts',
                'packages/core/src/lib/cache/manager.ts',
            ],
            exclude: [
                '**/*.d.ts',
                '**/*.test.*',
                '**/node_modules/**',
            ],
            thresholds: {
                lines: 90,
                functions: 90,
                statements: 90,
                branches: 90,
            },
        },
    },
}));
