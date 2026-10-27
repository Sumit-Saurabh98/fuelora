export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const LANGUAGES = ['en', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.some((m) => m === value);
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l === value);
}
