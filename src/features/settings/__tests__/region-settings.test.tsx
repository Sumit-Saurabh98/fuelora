import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { PaperProvider } from 'react-native-paper';

import { FixedClock } from '@/domain/clock';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { SettingsService } from '@/services/settings.service';

import { RegionSettings } from '../components/region-settings';
import { usePreferences } from '../preferences.store';

const mockService = new SettingsService(
  new InMemorySettingsRepository(),
  new FixedClock(new Date('2026-10-27T10:00:00.000Z')),
);
jest.mock('@/container', () => ({ getContainer: () => ({ settingsService: mockService }) }));

// Some locales use non-breaking spaces in currency output; match on plain spaces.
const normalizer = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

function renderRegion() {
  return render(
    <PaperProvider>
      <RegionSettings />
    </PaperProvider>,
  );
}

describe('RegionSettings', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'de-DE',
        languageCode: 'de',
        regionCode: 'DE',
        currencyCode: 'EUR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows India defaults: km, litres, km/L, PUC, lakh grouping', async () => {
    await renderRegion();
    expect(screen.getByText('km/L')).toBeTruthy();
    expect(screen.getByText('PUC')).toBeTruthy();
    expect(screen.getByText('100 km · 10 L · ₹1,00,000.00', { normalizer })).toBeTruthy();
  });

  it('switching to the US updates units, names and the example, and saves it', async () => {
    await renderRegion();

    await fireEvent.press(screen.getByText('United States'));

    expect(screen.getByText('mpg (US)')).toBeTruthy();
    expect(screen.getByText('Emissions / smog check')).toBeTruthy();
    expect(screen.getByText('62.1 mi · 2.64 US gal · $100,000.00', { normalizer })).toBeTruthy();
    expect(usePreferences.getState().region).toBe('US');
    expect((await mockService.getPreferences()).region).toBe('US');
  });

  it("labels Other with the device's currency", async () => {
    await renderRegion();
    expect(screen.getByText('Other (EUR)')).toBeTruthy();
  });
});
