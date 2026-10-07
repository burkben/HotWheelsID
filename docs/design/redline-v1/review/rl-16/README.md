# RL-16 app icon review

Reference: [Icon.png](../../png/Icon.png), [Icon.dc.html](../../source/Icon.dc.html), SPEC §5.

[icon-set.png](icon-set.png), left to right:

1. `icon.png`: the 1024 master, full-bleed and square, opaque RGB (iOS applies its own mask).
2. The Android adaptive icon: foreground over the `#07090F` background under a circle mask.
3. The Android themed icon: the monochrome track silhouette, tinted.
4. iOS-masked previews at 180, 120, 87, 58 and 40 px.

Regenerate every image asset with `npm run assets:images --workspace mobile`. Add
`-- --check` to verify the committed PNGs match a fresh export byte for byte.
`src/brand/appIcon.test.ts` probes the shipped files: size, no alpha channel and no
rounded mask.
