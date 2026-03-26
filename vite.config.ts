import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(env.VITE_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID),
        'import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN': JSON.stringify(env.VITE_EMAILJS_TEMPLATE_ADMIN || process.env.VITE_EMAILJS_TEMPLATE_ADMIN),
        'import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT': JSON.stringify(env.VITE_EMAILJS_TEMPLATE_CLIENT || process.env.VITE_EMAILJS_TEMPLATE_CLIENT),
        'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(env.VITE_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY),
        'import.meta.env.VITE_EMAILJS_ACCESS_TOKEN': JSON.stringify(env.VITE_EMAILJS_ACCESS_TOKEN || process.env.VITE_EMAILJS_ACCESS_TOKEN),
        'import.meta.env.VITE_KDB_ADMIN_EMAIL': JSON.stringify(env.VITE_KDB_ADMIN_EMAIL || process.env.VITE_KDB_ADMIN_EMAIL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
