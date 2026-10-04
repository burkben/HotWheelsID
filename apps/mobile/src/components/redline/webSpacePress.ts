import { Platform } from 'react-native';

/** RN Web handles Enter for every Pressable, but Space only for button roles. */
export function webSpacePress(onPress: () => void, disabled = false) {
  return Platform.OS === 'web' ? {
    onKeyDown: (event: { key: string; repeat: boolean; preventDefault: () => void }) => {
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (!disabled && !event.repeat) onPress();
      }
    },
  } : {};
}
