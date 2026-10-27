import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { PaperProvider } from 'react-native-paper';

import { FixedClock } from '@/domain/clock';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { SettingsService } from '@/services/settings.service';

import { RegionSettings } from '../components/region-settings';
import { UnitsSettings } from '../components/units-settings';
import { preferenceWritesSettled, usePreferences } from '../preferences.store';

const mockService = new SettingsService(
  new InMemorySettingsRepository(),
  new FixedClock(new Date('2026-10-27T10:00:00.000Z')),
);
jest.mock('@/container', () => ({ getContainer: () => ({ settingsService: mockService }) }));

// Some locales use non-breaking spaces in currency output; match on plain spaces.
const normalizer = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
const flush = () => preferenceWritesSettled();

function renderSettings() {
  return render(
    <PaperProvider>
      <RegionSettings />
      <UnitsSettings />
    </PaperProvider>,
  );
}

describe('Region and Units settings', () => {
  beforeEach(async () => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'de-DE',
        languageCode: 'de',
        regionCode: 'DE',
        currencyCode: 'EUR',
      } as unknown as Localization.Locale,
    ]);
    await mockService.changeRegion('IN');
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows India defaults: km, litres, km/L, PUC, lakh grouping', async () => {
    await renderSettings();
    expect(screen.getByText('km/L · region default')).toBeTruthy();
    expect(screen.getByText('PUC')).toBeTruthy();
    expect(screen.getByText('100 km · 10 L · ₹1,00,000.00', { normalizer })).toBeTruthy();
    expect(screen.queryByText('Reset to region defaults')).toBeNull();
  });

  it('switching to the US updates units, names and the example, and saves it', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByText('United States'));

    expect(screen.getByText('mpg (US) · region default')).toBeTruthy();
    expect(screen.getByText('Emissions / smog check')).toBeTruthy();
    expect(screen.getByText('62.1 mi · 2.64 US gal · $100,000.00', { normalizer })).toBeTruthy();
    expect((await mockService.getPreferences()).region).toBe('US');
  });

  it('overrides a single unit, then resets to the region defaults', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByText('Distance'));
    await fireEvent.press(screen.getByText('mi'));
    await flush();

    expect(screen.getByText('62.1 mi · 10 L · ₹1,00,000.00', { normalizer })).toBeTruthy();
    expect(screen.getByText('L · region default')).toBeTruthy(); // volume untouched
    expect((await mockService.getPreferences()).unitOverrides).toEqual({ distanceUnit: 'mi' });

    await fireEvent.press(screen.getByText('Reset to region defaults'));
    await flush();

    expect(screen.getByText('100 km · 10 L · ₹1,00,000.00', { normalizer })).toBeTruthy();
    expect((await mockService.getPreferences()).unitOverrides).toEqual({});
  });

  it('changing currency explains that old entries keep theirs', async () => {
    await renderSettings();
    expect(
      screen.getByText(/Applies to new entries\. Old entries keep their currency\./),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Currency'));
    await fireEvent.press(screen.getByText('EUR · €1,234.50', { normalizer }));
    await flush();

    expect(screen.getByText('100 km · 10 L · €1,00,000.00', { normalizer })).toBeTruthy();
  });

  it("labels Other with the device's currency", async () => {
    await renderSettings();
    expect(screen.getByText('Other (EUR)')).toBeTruthy();
  });
});
