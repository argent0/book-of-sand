"use client";

import { useEffect, useState } from "react";
import { Page } from "./Page";
import { PageControls } from "./PageControls";
import { ModeToggle } from "./ModeToggle";
import { LanguageToggle } from "./LanguageToggle";
import type { Direction, JumpSize, Language, Mode, SkeletonState } from "../lib/providers/types";

export interface PageState {
  text: string;
  pageNumber: string;
  illustration?: { dataUrl: string; description: string };
}

async function fetchPage(body: {
  currentPageText: string | null;
  direction?: Direction;
  jumpSize?: JumpSize;
  mode: Mode;
  language: Language;
  skeleton: SkeletonState | null;
}): Promise<{ page: PageState; skeleton: SkeletonState | null }> {
  const res = await fetch("/api/page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("text-generation-unavailable");
  }
  const json = await res.json();
  return {
    page: { text: json.text, pageNumber: json.pageNumber, illustration: json.illustration },
    skeleton: json.skeleton ?? null,
  };
}

export function Book() {
  const [page, setPage] = useState<PageState | null>(null);
  const [mode, setMode] = useState<Mode>("direct");
  const [language, setLanguage] = useState<Language>("en");
  const [skeleton, setSkeleton] = useState<SkeletonState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startOver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOver() {
    setLoading(true);
    setError(null);
    setSkeleton(null);
    try {
      const { page: next, skeleton: nextSkeleton } = await fetchPage({
        currentPageText: null,
        mode,
        language,
        skeleton: null,
      });
      setPage(next);
      setSkeleton(nextSkeleton);
    } catch {
      setError("The book resists opening — the model isn't reachable.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(newMode: Mode) {
    setMode(newMode);
    setSkeleton(null);
  }

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);
    setSkeleton(null);
  }

  async function turnPage(direction: Direction, jumpSize: JumpSize) {
    if (!page || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { page: next, skeleton: nextSkeleton } = await fetchPage({
        currentPageText: page.text,
        direction,
        jumpSize,
        mode,
        language,
        skeleton,
      });
      setPage(next);
      setSkeleton(nextSkeleton);
    } catch {
      setError("The book resists turning — the model isn't reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="scene">
      <div className="toolbar">
        <ModeToggle mode={mode} disabled={loading} onChange={changeMode} />
        <LanguageToggle language={language} disabled={loading} onChange={changeLanguage} />
      </div>
      <div className="book">
        {page && <Page key={page.text} pageNumber={page.pageNumber} text={page.text} illustration={page.illustration} />}
        {loading && <div className="loading">turning the page…</div>}
        {error && <div className="error">{error}</div>}
      </div>
      <PageControls
        disabled={loading || !page}
        onTurn={turnPage}
        onStartOver={startOver}
      />
    </main>
  );
}
