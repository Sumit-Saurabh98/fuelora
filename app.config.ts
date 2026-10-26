import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const variant: Variant = (() => {
  const v = process.env.APP_VARIANT;
  return v === 'preview' || v === 'production' ? v : 'development';
})();

// Placeholder until KB §9 Q3 is decided in Phase 5. The Play package name can never change
// after the first upload, so production must not ship with this value.
const APP_ID = 'com.fuelora.dev';

// Google's public sample IDs. Real IDs come in Phase 4/5 (ADS.md §9) and only for production.
const TEST_ADMOB = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  units: {
    android: {
      banner: 'ca-app-pub-3940256099942544/9214589741',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
      appOpen: 'ca-app-pub-3940256099942544/9257395921',
    },
    ios: {
      banner: 'ca-app-pub-3940256099942544/2435281174',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
      appOpen: 'ca-app-pub-3940256099942544/5575463023',
    },
  },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant === 'production' ? 'Fuelora' : `Fuelora (${variant})`,
  slug: 'fuelora',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'fuelora',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: APP_ID,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    variant,
    admob: TEST_ADMOB,
  },
});
