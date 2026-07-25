/**
 * Test-only stand-in for a bundled binary asset.
 *
 * Metro turns `require("…/car.jpg")` into an opaque numeric asset reference, but
 * the test runner would try to parse the JPEG as JavaScript. The vitest config
 * aliases image imports here so catalog artwork lookups stay testable.
 */
export default 1;
