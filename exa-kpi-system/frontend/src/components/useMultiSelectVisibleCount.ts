import { type RefObject, useLayoutEffect, useState } from "react";

const CHIP_CHROME_WIDTH = 32;
const CHIP_GAP = 5;
const TRIGGER_RESERVED_WIDTH = 34;

export function useMultiSelectVisibleCount(
  rootRef: RefObject<HTMLDivElement>,
  labels: string[],
) {
  const [visibleCount, setVisibleCount] = useState(() => Math.max(1, labels.length));
  const labelsKey = labels.join("\u0000");

  useLayoutEffect(() => {
    const root = rootRef.current;
    const trigger = root?.querySelector<HTMLButtonElement>(":scope > button");
    if (!root || !trigger || !labels.length) {
      setVisibleCount(1);
      return;
    }

    const calculate = () => {
      const style = getComputedStyle(trigger);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      context.font = style.font;

      const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const availableWidth = trigger.clientWidth - horizontalPadding - TRIGGER_RESERVED_WIDTH;
      const chipWidth = (text: string) => Math.ceil(context.measureText(text).width) + CHIP_CHROME_WIDTH;

      let nextCount = 1;
      for (let count = labels.length; count >= 1; count -= 1) {
        const hiddenCount = labels.length - count;
        const visibleWidth = labels.slice(0, count).reduce((sum, label) => sum + chipWidth(label), 0);
        const gapsWidth = CHIP_GAP * Math.max(0, count - 1 + (hiddenCount ? 1 : 0));
        const moreWidth = hiddenCount ? chipWidth(`+${hiddenCount} more`) : 0;
        if (visibleWidth + gapsWidth + moreWidth <= availableWidth) {
          nextCount = count;
          break;
        }
      }
      setVisibleCount((current) => current === nextCount ? current : nextCount);
    };

    calculate();
    const observer = new ResizeObserver(calculate);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [labelsKey, rootRef]);

  return Math.min(Math.max(1, visibleCount), Math.max(1, labels.length));
}
