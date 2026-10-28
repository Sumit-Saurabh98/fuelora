import '@/i18n/i18n';

// Icon fonts load through expo-asset, which has no registry under Jest.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = ({ name }: { name: string }) => <Text>{name}</Text>;
  return { __esModule: true, default: Icon };
});

// MMKV loads its native module at import time; tests get its in-memory stand-in.
jest.mock('react-native-mmkv', () => {
  const values = new Map<string, string | number | boolean>();
  return {
    createMMKV: () => ({
      getString: (key: string) => {
        const v = values.get(key);
        return typeof v === 'string' ? v : undefined;
      },
      set: (key: string, value: string | number | boolean) => void values.set(key, value),
      remove: (key: string) => values.delete(key),
    }),
  };
});
