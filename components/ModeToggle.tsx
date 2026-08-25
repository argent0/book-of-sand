import type { Mode } from "../lib/providers/types";

const MODES: { mode: Mode; label: string }[] = [
  { mode: "direct", label: "Direct" },
  { mode: "structured", label: "Structured" },
];

export function ModeToggle({
  mode,
  disabled,
  onChange,
}: {
  mode: Mode;
  disabled: boolean;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="mode-toggle">
      {MODES.map(({ mode: m, label }) => (
        <button
          key={m}
          className={m === mode ? "active" : ""}
          disabled={disabled || m === mode}
          onClick={() => onChange(m)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
