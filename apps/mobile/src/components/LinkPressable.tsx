import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

type Props = ComponentProps<typeof Pressable>;

/**
 * Expo Router's asChild slot merges `style` as an object, which discards a
 * Pressable style callback. Keep that callback in a separate prop until it
 * reaches the native Pressable. Link events, accessibility props, and refs
 * continue to pass through (React 19 forwards ref as a prop).
 */
export function LinkPressable({
  contentStyle,
  style,
  ...props
}: Props & { contentStyle: Props['style'] }) {
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        typeof contentStyle === 'function' ? contentStyle(state) : contentStyle,
      ]}
    />
  );
}
