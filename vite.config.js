import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env': process.env
  }
});
