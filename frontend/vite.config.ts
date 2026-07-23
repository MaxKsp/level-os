import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    base: '/',
    build: {
      assetsDir: 'frontend-assets',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/node_modules[\\/]react(?:-dom|-router|-router-dom)?[\\/]/.test(id)) return 'vendor-react';
            if (/node_modules[\\/](?:motion|framer-motion)[\\/]/.test(id)) return 'vendor-motion';
            if (id.includes('node_modules/@radix-ui/')) return 'vendor-radix';
            if (id.includes('node_modules/lucide-react/')) return 'vendor-icons';
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // O entrypoint 1.2.0 exporta também um wrapper Vue sem declarar Vue.
        // Consumimos o core SVG instalado pelo pacote, evitando dependência inútil.
        '@edusites/bancos-brasil/core': path.resolve(__dirname, 'node_modules/@edusites/bancos-brasil/src/core.js'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
      },
    },
  };
});
