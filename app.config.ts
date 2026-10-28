import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const variant: Variant = (() => {
  const v = process.env.APP_VARIANT;
  return v === 'preview' || v === 'production' ? v : 'development';
})();

// Placeholder until KB §9 Q3 is decided in Phase 5. The Play package name can never change
// after the first upload, so production must not ship with this value.
const APP_ID = 'com.fuelora.dev';

// Our own file type for backups (FR-23): ".fuelora", JSON inside. Not tied to the bundle id, so
// it doesn't change when the final id is chosen.
const BACKUP_UTI = 'app.fuelora.backup';

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
  owner: 'iamrealsubh',
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
      // "Open in Fuelora" for .fuelora files from WhatsApp, Mail, Files (FR-23).
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Fuelora backup',
          LSHandlerRank: 'Owner',
          LSItemContentTypes: [BACKUP_UTI],
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: BACKUP_UTI,
          UTTypeDescription: 'Fuelora backup',
          UTTypeConformsTo: ['public.json', 'public.data'],
          UTTypeTagSpecification: {
            'public.filename-extension': ['fuelora'],
            'public.mime-type': ['application/json'],
          },
        },
      ],
      // The OS copies the file into the app's Inbox; we read that copy.
      LSSupportsOpeningDocumentsInPlace: false,
    },
  },
  android: {
    package: APP_ID,
    adaptiveIcon: {
      backgroundColor: '#0E0E14',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // "Open with Fuelora" for backup files (FR-23). WhatsApp and Drive often send no extension
    // and a generic type, so JSON and octet-stream are accepted; the restore screen validates.
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: [
          { scheme: 'content', mimeType: 'application/json' },
          { scheme: 'content', mimeType: 'application/octet-stream' },
          { scheme: 'file', mimeType: '*/*', pathPattern: '.*\\.fuelora' },
        ],
      },
    ],
  },
  plugins: [
    './plugins/with-keep-app-data.js',
    'expo-router',
    'expo-localization',
    'expo-sqlite',
    '@react-native-community/datetimepicker',
    [
      'expo-notifications',
      {
        // Android shows the small icon as a white silhouette; the monochrome icon is made for that.
        icon: './assets/images/android-icon-monochrome.png',
        color: '#C8F542',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0E0E14',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    variant,
    admob: TEST_ADMOB,
    eas: {
      projectId: '73b296ca-5cb2-4e0e-8515-1ecc97188899',
    },
  },
});
