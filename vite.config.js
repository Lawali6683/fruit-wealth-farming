import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    define: {
      'import.meta.env.VITE_PAYSTACK_SECRET_KEY': JSON.stringify(env.VITE_PAYSTACK_SECRET_KEY),
    },
  };
});
