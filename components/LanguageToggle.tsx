import type { Language } from "../lib/providers/types";

const LANGUAGES: { language: Language; label: string }[] = [
  { language: "en", label: "English" },
  { language: "es", label: "Español" },
];

export function LanguageToggle({
  language,
  disabled,
  onChange,
}: {
  language: Language;
  disabled: boolean;
  onChange: (language: Language) => void;
}) {
  return (
    <div className="language-toggle">
      {LANGUAGES.map(({ language: l, label }) => (
        <button
          key={l}
          className={l === language ? "active" : ""}
          disabled={disabled || l === language}
          onClick={() => onChange(l)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
