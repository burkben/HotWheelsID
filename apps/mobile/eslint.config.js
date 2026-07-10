const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*']),
  expoConfig,
  {
    files: ['src/app/(tabs)/index.tsx', 'src/app/(tabs)/race.tsx'],
    rules: {
      // Existing event-driven effects intentionally fold external store/native
      // events into local UI state after render.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'src/ble/blePortal.ts',
      'src/ble/mpidBle.ts',
      'src/store/persistence/initPersistence.ts',
    ],
    rules: {
      // These native modules are loaded lazily so tests and web never evaluate them.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
