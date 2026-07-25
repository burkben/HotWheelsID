/**
 * Registers the `RedlineTV` AppRegistry root.
 *
 * The native side mounts this module name as a second React surface on the
 * *existing* RCTHost when an external display connects, so it runs in the same
 * JS runtime as the app — which is exactly why the Zustand module singletons
 * make the TV live with no state bridging. See
 * `docs/adr/0015-external-display-tv-mode.md`.
 *
 * Imported for its side effect from `index.js`, before any display can connect.
 */
import { AppRegistry } from 'react-native';

import { TV_ROOT_MODULE_NAME } from '../../modules/external-display';
import { TvStage } from './TvStage';

AppRegistry.registerComponent(TV_ROOT_MODULE_NAME, () => TvStage);
