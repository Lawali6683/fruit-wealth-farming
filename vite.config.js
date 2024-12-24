import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  return {
    define: {
      'process.env.PAYSTACK_SECRET_KEY': JSON.stringify(env.PAYSTACK_SECRET_KEY || ''),
    },
  };
});
