/**
 * App entry point.
 *
 * Wraps `expo-router/entry` so the `RedlineTV` AppRegistry root is registered
 * during the first JS evaluation. That has to happen before any external
 * display connects — a TV already attached at launch fires its scene
 * notification very early, and the native controller can only mount a surface
 * for a module name React Native already knows about.
 */
require('expo-router/entry');
require('./src/tv/registerTvRoot');
