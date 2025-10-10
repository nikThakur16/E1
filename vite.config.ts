import { defineConfig, type ConfigEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }: ConfigEnv) => {
  const isWebBuild = mode === 'web';
  const isExtensionBuild = mode === 'extension';
  const isGlobalBuild = mode === 'global';
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Only serve web.html at root in web mode
      ...(mode === 'web' ? [{
        name: 'serve-web-at-root',
        configureServer(server: any) {
          server.middlewares.use('/', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
            if (req.url === '/' && req.method === 'GET') {
              const webHtmlPath = resolve(__dirname, 'web.html');
              if (fs.existsSync(webHtmlPath)) {
                const webHtml = fs.readFileSync(webHtmlPath, 'utf-8');
                res.setHeader('Content-Type', 'text/html');
                res.end(webHtml);
                return;
              }
            }
            next();
          });
        }
      }] : []),
      // Only copy extension files for extension build
      ...(isExtensionBuild ? [viteStaticCopy({
        targets: [
          { src: "public/manifest.json", dest: "." },
          { src: "src/background.js", dest: "." },
          { src: "src/content-script.js", dest: "." },
          { src: "public/offscreen.js", dest: "." },
          { src: "public/offScreen.html", dest: "." },
          { src: "public/permissionRequest.html", dest: "." },
          { src: "public/permissionRequest.js", dest: "." },
          { src: "public/popup/**", dest: "popup" },
          { src: "public/web/**", dest: "web" },
          { src: "public/vite.svg", dest: "." },
        ],
      })] : []),
      // Copy all files for global build
      ...(isGlobalBuild ? [viteStaticCopy({
        targets: [
          { src: "public/manifest.json", dest: "." },
          { src: "src/background.js", dest: "." },
          { src: "src/content-script.js", dest: "." },
          { src: "public/offscreen.js", dest: "." },
          { src: "public/offScreen.html", dest: "." },
          { src: "public/permissionRequest.html", dest: "." },
          { src: "public/permissionRequest.js", dest: "." },
          { src: "public/popup/**", dest: "popup" },
          { src: "public/web/**", dest: "web" },
          { src: "public/vite.svg", dest: "." },
        ],
      })] : []),
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: [".ngrok-free.app"],
    },
    build: {
      rollupOptions: {
        input: isWebBuild 
          ? resolve(__dirname, "web.html")
          : isGlobalBuild
          ? {
              popup: resolve(__dirname, "index.html"),
              web: resolve(__dirname, "web.html")
            }
          : {
              popup: resolve(__dirname, "index.html"),
              web: resolve(__dirname, "web.html")
            },
      },
      outDir: isWebBuild ? "dist-web" : isGlobalBuild ? "dist" : "dist-extension",
      emptyOutDir: true,
      minify: mode === 'production' ? 'terser' as const : false,
      sourcemap: mode === 'development',
    },
    base: isWebBuild ? '/web.html' : '/',
  };
});
