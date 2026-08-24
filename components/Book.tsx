"use client";

import { useEffect, useState } from "react";
import { Page } from "./Page";
import { PageControls } from "./PageControls";
import type { Direction, JumpSize } from "../lib/providers/types";

export interface PageState {
  text: string;
  pageNumber: string;
  illustration?: { dataUrl: string; description: string };
}

async function fetchPage(body: {
  currentPageText: string | null;
  direction?: Direction;
  jumpSize?: JumpSize;
}): Promise<PageState> {
  const res = await fetch("/api/page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("text-generation-unavailable");
  }
  return res.json();
}

export function Book() {
  const [page, setPage] = useState<PageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startOver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOver() {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPage({ currentPageText: null });
      setPage(next);
    } catch {
      setError("The book resists opening — the model isn't reachable.");
    } finally {
      setLoading(false);
    }
  }

  async function turnPage(direction: Direction, jumpSize: JumpSize) {
    if (!page || loading) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPage({ currentPageText: page.text, direction, jumpSize });
      setPage(next);
    } catch {
      setError("The book resists turning — the model isn't reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="scene">
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
