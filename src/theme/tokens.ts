export const colors = {
  canvas: '#F8F7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F4F2',
  primary: '#356D67',
  primaryDark: '#214A46',
  primarySoft: '#DFEDE9',
  accent: '#D8955A',
  accentSoft: '#F9E9D9',
  success: '#367653',
  successSoft: '#E2F2E8',
  warning: '#94601F',
  warningSoft: '#FFF0D6',
  danger: '#A83F3E',
  dangerSoft: '#FBE7E5',
  ink: '#202B2A',
  inkMuted: '#5F6F6D',
  border: '#D9E2DE',
  borderStrong: '#BCCBC5',
  focus: '#1B5F59',
  white: '#FFFFFF',
  overlay: 'rgba(31, 42, 42, 0.42)',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 38, lineHeight: 46, fontWeight: '700' as const },
  h1: { fontSize: 29, lineHeight: 36, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 29, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 25, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  elderDisplay: { fontSize: 40, lineHeight: 50, fontWeight: '700' as const },
  elderBody: { fontSize: 21, lineHeight: 31, fontWeight: '500' as const },
} as const;

export const buttonSizes = {
  sm: { minHeight: 48, paddingHorizontal: spacing.lg },
  md: { minHeight: 56, paddingHorizontal: spacing.xl },
  lg: { minHeight: 68, paddingHorizontal: spacing.xxl },
  elder: { minHeight: 88, paddingHorizontal: spacing.xl },
} as const;

export const tapTargets = { minimum: 48, comfortable: 56, elder: 88 } as const;

export const shadows = {
  subtle: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  raised: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

export const layout = {
  screenGutter: spacing.xl,
  screenTop: spacing.lg,
  screenBottom: spacing.xxxl,
  sectionGap: spacing.xxl,
  contentMaxWidth: 720,
} as const;

export const motion = { fast: 150, standard: 220, slow: 320 } as const;

export const theme = {
  buttonSizes,
  colors,
  layout,
  motion,
  radius,
  shadows,
  spacing,
  tapTargets,
  typography,
};
export type AppTheme = typeof theme;
