import { SYMBOL, WORDMARK } from "./logo-geometry";

// Inline, theme-aware Braventa logo. Glyph and wordmark use currentColor; the node uses the
// logo-node role (Cobalt on light, Volt on dark). Rules: docs/brand/VISUAL_IDENTITY.md#2-logo

type Props = {
  /** "lockup" = symbol + wordmark (default), "symbol" = Waypoint mark only. */
  variant?: "lockup" | "symbol";
  /** Rendered height in px. Minimum 20 for the lockup, 16 for the symbol. */
  height?: number;
  className?: string;
};

const SYMBOL_H = 130; // lockup units: wordmark cap = 100
const GAP = 45;

function Mark() {
  return (
    <>
      {SYMBOL.paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={SYMBOL.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <circle cx={SYMBOL.node.cx} cy={SYMBOL.node.cy} r={SYMBOL.node.r} className="fill-logo-node" />
    </>
  );
}

export function Logo({ variant = "lockup", height = 24, className }: Props) {
  const { box } = SYMBOL;
  if (variant === "symbol") {
    return (
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        height={height}
        width={(box.w / box.h) * height}
        role="img"
        aria-label="Braventa"
        className={className}
      >
        <Mark />
      </svg>
    );
  }

  const s = SYMBOL_H / box.h;
  const symbolW = box.w * s;
  const width = symbolW + GAP + WORDMARK.width;
  return (
    <svg
      viewBox={`0 0 ${width} ${SYMBOL_H}`}
      height={height}
      width={(width / SYMBOL_H) * height}
      role="img"
      aria-label="Braventa"
      className={className}
    >
      <g transform={`translate(${-box.x * s} ${-box.y * s}) scale(${s})`}>
        <Mark />
      </g>
      <path
        transform={`translate(${symbolW + GAP} ${SYMBOL_H / 2 + WORDMARK.cap / 2}) scale(${WORDMARK.scale})`}
        d={WORDMARK.d}
        fill="currentColor"
      />
    </svg>
  );
}
