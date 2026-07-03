import { Text, TextProps, TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

type AppTextProps = TextProps & {
  variant?: Variant;
  color?: keyof typeof colors;
  align?: TextStyle['textAlign'];
};

export function AppText({
  variant = 'body',
  color = 'ink',
  align,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[typography[variant], { color: colors[color], textAlign: align }, style]}
    />
  );
}
