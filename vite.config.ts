import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// Run tests from the tests/ directory
		include: ['tests/**/*.{test,spec}.{js,ts}'],

		// Set up a browser-like environment for component testing
		environment: 'jsdom',

		// Run a setup file before each test file
		setupFiles: ['./tests/setup.ts']
	}
});
