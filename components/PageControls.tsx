import type { Direction, JumpSize } from "../lib/providers/types";

const SIZES: { size: JumpSize; label: string }[] = [
  { size: "small", label: "Small" },
  { size: "medium", label: "Medium" },
  { size: "large", label: "Large" },
];

export function PageControls({
  disabled,
  onTurn,
  onStartOver,
}: {
  disabled: boolean;
  onTurn: (direction: Direction, jumpSize: JumpSize) => void;
  onStartOver: () => void;
}) {
  return (
    <div className="controls">
      <div className="controls-group">
        <span className="controls-label">◀ Backward</span>
        {SIZES.map(({ size, label }) => (
          <button key={`back-${size}`} disabled={disabled} onClick={() => onTurn("backward", size)}>
            {label}
          </button>
        ))}
      </div>
      <div className="controls-group">
        <span className="controls-label">Forward ▶</span>
        {SIZES.map(({ size, label }) => (
          <button key={`fwd-${size}`} disabled={disabled} onClick={() => onTurn("forward", size)}>
            {label}
          </button>
        ))}
      </div>
      <button className="start-over" disabled={disabled} onClick={onStartOver}>
        ⟲ Start Over
      </button>
    </div>
  );
}
