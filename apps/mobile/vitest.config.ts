import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));
const assets = fileURLToPath(new URL("./assets", import.meta.url));
const assetStub = fileURLToPath(new URL("./src/test/assetStub.ts", import.meta.url));
const reactNativeStub = fileURLToPath(new URL("./src/test/reactNativeStub.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Bundled catalog artwork is referenced from a generated asset map. Metro
      // resolves those to numeric asset refs; the test runner would otherwise
      // try to parse the image bytes as JavaScript.
      { find: /^.*\.(jpg|jpeg|png|gif|webp|svg)$/, replacement: assetStub },
      // react-native ships Flow-typed source that the runner cannot parse. Only
      // component tests pull it in, and they inspect element trees rather than
      // mounting, so host components just need stable identities.
      { find: /^react-native$/, replacement: reactNativeStub },
      // Mirror the tsconfig `paths` so modules under test resolve the same way
      // they do under Metro. `@/assets` is checked first as it is more specific.
      { find: /^@\/assets\/(.*)$/, replacement: `${assets}/$1` },
      { find: /^@\/(.*)$/, replacement: `${src}/$1` },
    ],
  },
});
