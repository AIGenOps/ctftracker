import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

const rootDir = process.cwd();

async function runBuild() {
  console.log('🚀 Building CTF Tracker extension...');

  // 1. Build UI pages (popup.html and dashboard.html)
  console.log('📦 Building HTML pages (popup, dashboard)...');
  await build({
    root: rootDir,
    plugins: [react()],
    base: '',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'popup.html'),
          dashboard: resolve(rootDir, 'dashboard.html'),
        },
      },
    },
  });

  // 2. Build Background Service Worker (ES module)
  console.log('⚙️ Building Background Service Worker...');
  await build({
    root: rootDir,
    base: '',
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/background/service-worker.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  // 3. Build Content Script (IIFE for standalone script injection)
  console.log('🔍 Building Content Script...');
  await build({
    root: rootDir,
    base: '',
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/content/detector.ts'),
        formats: ['iife'],
        name: 'CTFTrackerContent',
        fileName: () => 'content.js',
      },
    },
  });

  // 4. Ensure manifest.json and icons are in dist/
  console.log('📋 Ensuring manifest.json and icons are in dist...');
  if (!existsSync('dist/icons')) {
    mkdirSync('dist/icons', { recursive: true });
  }
  copyFileSync('public/manifest.json', 'dist/manifest.json');
  copyFileSync('public/icons/icon-16.png', 'dist/icons/icon-16.png');
  copyFileSync('public/icons/icon-48.png', 'dist/icons/icon-48.png');
  copyFileSync('public/icons/icon-128.png', 'dist/icons/icon-128.png');

  console.log('✅ CTF Tracker build complete! Output is in dist/');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
