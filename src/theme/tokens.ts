export const colors = {
  canvas: '#F7F7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3F1',
  primary: '#376B67',
  primaryDark: '#244B48',
  primarySoft: '#DCEBE7',
  accent: '#E8A86B',
  accentSoft: '#FAE9D8',
  success: '#3F7D5A',
  successSoft: '#E2F1E7',
  warning: '#A66A24',
  warningSoft: '#FFF0D8',
  danger: '#B94A48',
  dangerSoft: '#FBE5E3',
  ink: '#1F2A2A',
  inkMuted: '#667373',
  border: '#DDE4E1',
  white: '#FFFFFF',
  overlay: 'rgba(31, 42, 42, 0.42)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 36, lineHeight: 43, fontWeight: '700' as const },
  h1: { fontSize: 28, lineHeight: 35, fontWeight: '700' as const },
  h2: { fontSize: 21, lineHeight: 28, fontWeight: '700' as const },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;

export const shadows = {
  card: {
    shadowColor: '#1F2A2A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
} as const;

export const theme = { colors, spacing, radius, typography, shadows };
export type AppTheme = typeof theme;
