import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './vitest.setup.js',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'vitest.setup.js',
                '**/*.test.{js,jsx}',
                '**/*.spec.{js,jsx}',
                '**/dist/**',
                '**/build/**'
            ]
        },
        // Mock aliases to match your Vite config
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
