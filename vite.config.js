import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// בקשות ל-/api מועברות לשרת ה-.NET (הפרופיל MyProject ב-launchSettings), כך שאין צורך ב-CORS בפיתוח.
// secure: false - תעודת הפיתוח של ASP.NET היא self-signed
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://localhost:7017', secure: false },
    },
  },
});
