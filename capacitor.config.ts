import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.draftadvisor.app',
  appName: 'CourtVision AI',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
