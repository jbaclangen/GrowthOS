import { LOCKUP, SYMBOL, WORDMARK } from "./logo-geometry";

// Inline Braventa logo (D-027): a white B on an Ink tile with a Violet dot, plus the BRAVENTA.IO wordmark.
// Tile and B swap with the theme (logo-tile / logo-letter); the dot is Violet; the wordmark uses currentColor. Rules:
// docs/brand/VISUAL_IDENTITY.md#2-logo

type Props = {
  /** "lockup" = mark + wordmark (default), "symbol" = the tile mark only. */
  variant?: "lockup" | "symbol";
  /** Rendered height in px. Minimum 20 for the lockup, 16 for the symbol. */
  height?: number;
  className?: string;
};

function Mark() {
  const { tile, dot } = SYMBOL;
  return (
    <>
      <rect width={tile.size} height={tile.size} rx={tile.rx} className="fill-logo-tile" />
      <path d={SYMBOL.letter} className="fill-logo-letter" />
      <circle cx={dot.cx} cy={dot.cy} r={dot.r} className="fill-logo-node" />
    </>
  );
}

export function Logo({ variant = "lockup", height = 24, className }: Props) {
  const size = SYMBOL.tile.size;
  if (variant === "symbol") {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} height={height} width={height} role="img" aria-label="Braventa" className={className}>
        <Mark />
      </svg>
    );
  }

  const symbolH = LOCKUP.symbolHeight; // lockup units: wordmark cap = 100
  const width = symbolH + LOCKUP.gap + WORDMARK.width;
  return (
    <svg
      viewBox={`0 0 ${width} ${symbolH}`}
      height={height}
      width={(width / symbolH) * height}
      role="img"
      aria-label="Braventa"
      className={className}
    >
      <g transform={`scale(${symbolH / size})`}>
        <Mark />
      </g>
      <path
        transform={`translate(${symbolH + LOCKUP.gap} ${symbolH / 2 + WORDMARK.cap / 2}) scale(${WORDMARK.scale})`}
        d={WORDMARK.d}
        fill="currentColor"
      />
    </svg>
  );
}
