import '@/i18n/i18n';

// Icon fonts load through expo-asset, which has no registry under Jest.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = ({ name }: { name: string }) => <Text>{name}</Text>;
  return { __esModule: true, default: Icon };
});
