import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

process.env.TZ = 'Europe/Madrid'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment for React components
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./src/test-utils/setup.ts'],
    
    // Global test utilities
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '*.config.{js,ts}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/index.{ts,tsx}'
      ],
      // 80% threshold for auth and core modules
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        },
        'src/features/auth/': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        },
        'src/core/': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        }
      }
    },
    
    // Include patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '.git/',
      '*.config.{js,ts}',
      'public/'
    ],

    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose'],
    
    // Mock options
    clearMocks: true,
    restoreMocks: true,
    
    // Watch options for development
    watch: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/', 'dist/', 'build/']
    }
  },
  
  // Path resolution matching main Vite config
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Define global variables for tests
  define: {
    'import.meta.vitest': undefined,
  },
})