/**
 * Ambient declarations for bundled image assets.
 *
 * Metro resolves an image import to an opaque numeric asset reference, which is
 * what `ImageSourcePropType` accepts for local sources. TypeScript needs to be
 * told that, since these are not JavaScript modules.
 */
declare module "*.jpg" {
  const asset: number;
  export default asset;
}

declare module "*.jpeg" {
  const asset: number;
  export default asset;
}

declare module "*.png" {
  const asset: number;
  export default asset;
}

declare module "*.gif" {
  const asset: number;
  export default asset;
}

declare module "*.webp" {
  const asset: number;
  export default asset;
}
