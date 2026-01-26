import { defineConfig, build as viteBuild } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'src/content/styles.css', dest: '.' },
        { src: 'src/sidepanel/index.html', dest: '.', rename: 'sidepanel.html' },
      ],
    }),
    {
      name: 'build-content-script',
      async closeBundle() {
        await viteBuild({
          configFile: false,
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src'),
              '@shared': resolve(__dirname, 'src/shared'),
              '@content': resolve(__dirname, 'src/content'),
            },
          },
          build: {
            outDir: resolve(__dirname, 'dist'),
            emptyOutDir: false,
            rollupOptions: {
              input: resolve(__dirname, 'src/content/index.ts'),
              output: {
                entryFileNames: 'content.js',
                format: 'iife',
              },
            },
          },
          publicDir: false,
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
  },
  publicDir: false,
});
