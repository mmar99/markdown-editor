import { describe, expect, it } from "vitest";
import { TAB_GAP_PX, TAB_MAX_WIDTH_PX, buildTabWidthCss, computeTabWidth } from "./tabSizing";

describe("tabSizing", () => {
  it("caps wide layouts at the fixed maximum width", () => {
    expect(computeTabWidth(900, 3)).toBe(TAB_MAX_WIDTH_PX);
  });

  it("compresses tabs proportionally once the bar is full", () => {
    expect(computeTabWidth(900, 7)).toBeCloseTo((900 - TAB_GAP_PX * 6) / 7);
  });

  it("keeps every tab visible even for very dense tab counts", () => {
    const containerWidth = 540;
    const tabCount = 15;
    const width = computeTabWidth(containerWidth, tabCount);
    const totalWidth = width * tabCount + TAB_GAP_PX * (tabCount - 1);

    expect(width).toBeGreaterThan(0);
    expect(totalWidth).toBeLessThanOrEqual(containerWidth);
  });

  it("builds a CSS basis formula that matches the container width", () => {
    expect(buildTabWidthCss(1)).toBe("200px");
    expect(buildTabWidthCss(7)).toBe("min(200px, calc((100% - 12px) / 7))");
  });
});
