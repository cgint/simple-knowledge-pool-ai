import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    // Run tests from the tests/ directory
    include: ['tests/**/*.{test,spec}.{js,ts}'],

    // Set up a browser-like environment for component testing
    environment: 'jsdom',

    // Force ESM export condition resolution to browser for Svelte during tests
    environmentOptions: {
      customExportConditions: ['browser']
    },

    // Run a setup file before each test file
    setupFiles: ['./tests/setup.ts']
  }
});
