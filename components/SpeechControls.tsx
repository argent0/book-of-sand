export type SpeechState = "idle" | "loading" | "playing" | "paused";

const LABELS: Record<SpeechState, string> = {
  idle: "▶ Read Aloud",
  loading: "Loading…",
  playing: "⏸ Pause",
  paused: "▶ Resume",
};

export function SpeechControls({
  state,
  canStart,
  autoAdvance,
  onTogglePlay,
  onToggleAutoAdvance,
}: {
  state: SpeechState;
  canStart: boolean;
  autoAdvance: boolean;
  onTogglePlay: () => void;
  onToggleAutoAdvance: (value: boolean) => void;
}) {
  const disabled = state === "loading" || (state === "idle" && !canStart);

  return (
    <div className="speech-controls">
      <button disabled={disabled} onClick={onTogglePlay}>
        {LABELS[state]}
      </button>
      <label className="auto-advance">
        <input
          type="checkbox"
          checked={autoAdvance}
          onChange={(e) => onToggleAutoAdvance(e.target.checked)}
        />
        Auto-advance
      </label>
    </div>
  );
}
