import type { TextProps } from "./types";

export const TEXT_BOX_PADDING_X = 12;
export const TEXT_BOX_PADDING_Y = 10;
export const TEXT_LINE_HEIGHT = 1.35;
const TEXT_WIDTH_BUFFER = 2;

export function getTextDomFontFamily(
  fontFamily: TextProps["fontFamily"]
): string {
  switch (fontFamily) {
    case "serif":
      return "var(--font-playfair), ui-serif, Georgia, serif";
    case "mono":
      return "var(--font-ibm-plex-mono), ui-monospace, monospace";
    case "display":
      return "var(--font-playfair), ui-serif, Georgia, serif";
    case "sans":
    default:
      return "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif";
  }
}

export function measureTextNodeSize(textProps: TextProps): {
  width: number;
  height: number;
} {
  if (typeof document === "undefined") {
    return { width: 40, height: 40 };
  }
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.left = "-99999px";
  probe.style.top = "-99999px";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.whiteSpace = "pre";
  probe.style.display = "inline-block";
  probe.style.boxSizing = "border-box";
  probe.style.fontSize = `${textProps.fontSize}px`;
  probe.style.fontFamily = getTextDomFontFamily(textProps.fontFamily);
  probe.style.fontWeight = textProps.fontWeight;
  probe.style.fontStyle = textProps.fontStyle;
  probe.style.textDecoration = textProps.textDecoration;
  probe.style.lineHeight = String(TEXT_LINE_HEIGHT);
  probe.textContent = textProps.text.length > 0 ? textProps.text : " ";

  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  const lines = (textProps.text.length > 0 ? textProps.text : " ").split("\n");
  document.body.removeChild(probe);

  return {
    width: Math.max(
      24,
      Math.ceil(width + TEXT_BOX_PADDING_X * 2 + TEXT_WIDTH_BUFFER)
    ),
    height: Math.max(
      Math.ceil(textProps.fontSize * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2),
      Math.ceil(lines.length * textProps.fontSize * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2)
    ),
  };
}
