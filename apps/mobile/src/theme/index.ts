export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryDisabled: '#93c5fd',

  background: '#f2f3f5',
  surface: '#ffffff',
  surfaceMuted: '#e8eaee',
  border: '#e5e7eb',
  inputBorder: '#d1d5db',

  text: '#111827',
  textMuted: '#6b7280',
  textInverse: '#ffffff',

  danger: '#dc2626',
  dangerSurface: '#fef2f2',
  success: '#16a34a',
  successBackground: '#dcfce7',
  warning: '#d97706',

  avatar: '#1e293b',
  chipBackground: '#e8eefc',
  iconBlue: '#2563eb',
  iconBlueBackground: '#eaf1fd',
  iconBlueBorder: '#cbd9f6',
  iconOrange: '#ea580c',
  iconOrangeBackground: '#fff1e8',
  iconSlate: '#475569',
  iconSlateBackground: '#eef1f5',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 16, fontWeight: '400' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 16, fontWeight: '600' },
  button: { fontSize: 18, fontWeight: '600' },
  caption: { fontSize: 14, fontWeight: '400' },
} as const;

export const layout = {
  controlHeight: 52,
} as const;

export type TypographyVariant = keyof typeof typography;
