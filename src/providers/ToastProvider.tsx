import { Ionicons } from '@expo/vector-icons';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, shadows, spacing } from '@/theme';

type ToastTone = 'success' | 'error' | 'info';
type ToastOptions = { message: string; tone?: ToastTone };
type ToastContextValue = { showToast: (options: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
const palettes = {
  success: { background: colors.success, icon: 'checkmark-circle' },
  error: { background: colors.danger, icon: 'alert-circle' },
  info: { background: colors.primaryDark, icon: 'information-circle' },
} as const;

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...options, id });
    timer.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const palette = palettes[toast?.tone ?? 'info'];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole={toast.tone === 'error' ? 'alert' : undefined}
          style={[styles.toast, { backgroundColor: palette.background, top: insets.top + spacing.md }]}>
          <Ionicons color={colors.white} name={palette.icon} size={22} />
          <AppText color="white" style={styles.message} variant="bodyStrong">
            {toast.message}
          </AppText>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    maxWidth: 560,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'absolute',
    pointerEvents: 'none',
    right: spacing.lg,
    zIndex: 100,
    ...shadows.raised,
  },
  message: { flex: 1 },
});
