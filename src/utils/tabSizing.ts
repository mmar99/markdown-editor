export const TAB_MAX_WIDTH_PX = 200;
export const TAB_GAP_PX = 2;

export function computeTabWidth(containerWidth: number, tabCount: number): number {
  if (containerWidth <= 0 || tabCount <= 0) return 0;

  const totalGapWidth = TAB_GAP_PX * Math.max(0, tabCount - 1);
  const availableWidth = Math.max(0, containerWidth - totalGapWidth);

  return Math.min(TAB_MAX_WIDTH_PX, availableWidth / tabCount);
}

export function buildTabWidthCss(tabCount: number): string {
  if (tabCount <= 1) return `${TAB_MAX_WIDTH_PX}px`;

  const totalGapWidth = TAB_GAP_PX * Math.max(0, tabCount - 1);
  return `min(${TAB_MAX_WIDTH_PX}px, calc((100% - ${totalGapWidth}px) / ${tabCount}))`;
}
