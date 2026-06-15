import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.misautonomos.app',
  appName: 'MisAutónomos',
  // Vite -> 'dist'. Si tu web es Next.js con export estático -> 'out'
  webDir: 'dist',
  backgroundColor: '#00255C',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#00255C',
      showSpinner: false,
    },
  },
};

export default config;
