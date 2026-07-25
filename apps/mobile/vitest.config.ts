import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));
const assets = fileURLToPath(new URL("./assets", import.meta.url));
const assetStub = fileURLToPath(new URL("./src/test/assetStub.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Bundled catalog artwork is referenced from a generated asset map. Metro
      // resolves those to numeric asset refs; the test runner would otherwise
      // try to parse the image bytes as JavaScript.
      { find: /^.*\.(jpg|jpeg|png|gif|webp|svg)$/, replacement: assetStub },
      // Mirror the tsconfig `paths` so modules under test resolve the same way
      // they do under Metro. `@/assets` is checked first as it is more specific.
      { find: /^@\/assets\/(.*)$/, replacement: `${assets}/$1` },
      { find: /^@\/(.*)$/, replacement: `${src}/$1` },
    ],
  },
});
