import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' 로 두면 dist 폴더를 어떤 정적 호스팅(GitHub Pages, Cloudflare Pages 등)에
// 올려도 경로가 깨지지 않습니다.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
