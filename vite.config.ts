import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
	plugins: [
		// Only load devtools in development — never ship debug tooling to production
		mode === 'development' ? devtools() : false,
		solidPlugin(),
		tailwindcss(),
	].filter(Boolean),
	server: {
		port: 3000,
	},
	build: {
		target: 'esnext',
	},
}));

