import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: [
            'src/**/*.test.{ts,tsx}',
            'convex/**/*.test.{ts,tsx}',
        ],
        coverage: {
            provider: 'v8',
            include: ['src/lib/**', 'src/i18n/**/*.ts', 'src/components/**'],
            exclude: [
                'src/**/__tests__/**',
                'src/components/AuthGuard.tsx',
                'src/components/Layout.tsx',
                'src/components/SubscriptionGuard.tsx',
                'src/hooks/useDevLogger.ts',
                'src/i18n/locales/**',
            ],
            thresholds: {
                lines: 50,
            },
        },
    },
})
