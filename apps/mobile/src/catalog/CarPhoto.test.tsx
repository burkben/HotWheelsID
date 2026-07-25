import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import { CarPhoto } from "./CarPhoto";

/** Collapses a style prop (object or array) into one flat object. */
function styleOf(el: ReactElement): Record<string, unknown> {
  const style = (el.props as { style?: unknown }).style;
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

/** `CarPhoto` uses no hooks, so it can be called directly for its element tree. */
function render(props: Parameters<typeof CarPhoto>[0]): ReactElement {
  return CarPhoto(props) as unknown as ReactElement;
}

const CAR = "super-blitzen";

describe("CarPhoto layout", () => {
  it("sizes a wrapper View rather than the Image itself", () => {
    // Bundled assets are 1x, so an <Image> reports its pixel height as its
    // intrinsic point height. Pairing that measurement with `aspectRatio` makes
    // Yoga derive the width from the height and ignore a percentage width, which
    // once blew a 362pt hero out to 582pt and pushed the car off screen. A plain
    // <View> has no intrinsic size, so the box has to live there.
    const el = render({ carId: CAR, width: "100%", aspectRatio: 16 / 10 });
    expect(el.type).toBe("View");
    expect(styleOf(el)).toMatchObject({ width: "100%", aspectRatio: 16 / 10 });

    const image = (el.props as { children: ReactElement }).children;
    expect(image.type).toBe("Image");
    const imageStyle = styleOf(image);
    expect(imageStyle.aspectRatio).toBeUndefined();
    expect(imageStyle).toMatchObject({ width: "100%", height: "100%" });
  });

  it("clips the photo to the frame so corners and the ring stay clean", () => {
    const el = render({ carId: CAR, size: 56, rounded: 8, ring: true });
    expect(styleOf(el)).toMatchObject({
      overflow: "hidden",
      width: 56,
      height: 56,
      borderRadius: 8,
      borderWidth: 2,
    });
  });

  it("falls back to a placeholder that carries the same box", () => {
    const el = render({ carId: null, width: "100%", aspectRatio: 1 });
    expect(el.type).toBe("View");
    expect(styleOf(el)).toMatchObject({ width: "100%", aspectRatio: 1 });
  });
});
