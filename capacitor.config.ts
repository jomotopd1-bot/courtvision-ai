import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.draftadvisor.app',
  appName: 'Draft Advisor',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
