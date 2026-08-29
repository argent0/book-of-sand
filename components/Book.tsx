"use client";

import { useEffect, useRef, useState } from "react";
import { Page } from "./Page";
import { PageControls } from "./PageControls";
import { ModeToggle } from "./ModeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { SpeechControls, type SpeechState } from "./SpeechControls";
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

async function fetchTranslation(text: string, language: Language): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) {
    throw new Error("translation-unavailable");
  }
  const json = await res.json();
  return json.text;
}

async function fetchSpeech(text: string): Promise<Blob> {
  const res = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error("speech-unavailable");
  }
  return res.blob();
}

interface PrefetchResult {
  page: PageState;
  skeleton: SkeletonState | null;
  audioUrl: string | null;
}

// Fetches the next page and, for English, its narration audio ahead of time
// so an auto-advance transition can swap them in with no generation delay.
// A speech failure degrades gracefully (audioUrl: null, page still usable);
// a page-fetch failure is the only case that fails the whole prefetch.
async function prefetchNext(
  fromPage: PageState,
  mode: Mode,
  language: Language,
  skeleton: SkeletonState | null
): Promise<PrefetchResult | null> {
  let next: PageState;
  let nextSkeleton: SkeletonState | null;
  try {
    ({ page: next, skeleton: nextSkeleton } = await fetchPage({
      currentPageText: fromPage.text,
      direction: "forward",
      jumpSize: "small",
      mode,
      language,
      skeleton,
    }));
  } catch {
    return null;
  }

  let audioUrl: string | null = null;
  if (language === "en") {
    try {
      audioUrl = URL.createObjectURL(await fetchSpeech(next.text));
    } catch {
      audioUrl = null;
    }
  }

  return { page: next, skeleton: nextSkeleton, audioUrl };
}

export function Book() {
  const [page, setPage] = useState<PageState | null>(null);
  const [mode, setMode] = useState<Mode>("direct");
  const [language, setLanguage] = useState<Language>("en");
  const [skeleton, setSkeleton] = useState<SkeletonState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [autoAdvance, setAutoAdvance] = useState(false);

  // Refs so the persistent <audio> element's event handlers (registered once,
  // at mount) always act on current state instead of a stale render closure.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const spokenTextRef = useRef<string | null>(null);
  const autoAdvanceRef = useRef(autoAdvance);
  const sessionIdRef = useRef(0);
  const latestRef = useRef({ page, mode, language, skeleton });

  // One-page-ahead prefetch pipeline for auto-advance: keyed by the page it
  // was computed for, plus a generation counter so a prefetch superseded
  // before anyone consumes it still gets its audio URL revoked instead of
  // leaking.
  const prefetchRef = useRef<{ forPageText: string; resultPromise: Promise<PrefetchResult | null> } | null>(null);
  const prefetchGenRef = useRef(0);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    latestRef.current = { page, mode, language, skeleton };
  });

  // While auto-advance is on and a page is actively playing, keep one page
  // (text + English audio) prefetched ahead so the next transition is
  // instant instead of waiting on generation.
  useEffect(() => {
    if (!page || !autoAdvance || language !== "en" || speechState !== "playing") return;
    ensurePrefetchFor(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, autoAdvance, language, speechState]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handlePlay = () => setSpeechState("playing");
    const handlePause = () => {
      if (!audio.ended) setSpeechState("paused");
    };
    const handleEnded = () => {
      setSpeechState("idle");
      if (autoAdvanceRef.current) {
        void autoAdvanceTurn();
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      prefetchRef.current?.resultPromise.then((result) => {
        if (result?.audioUrl) URL.revokeObjectURL(result.audioUrl);
      });
    };
  }, []);

  useEffect(() => {
    startOver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOver() {
    sessionIdRef.current += 1;
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

  async function changeLanguage(newLanguage: Language) {
    if (newLanguage === language || loading) return;
    setLanguage(newLanguage);

    if (!page) return;
    setLoading(true);
    setError(null);
    try {
      const translatedText = await fetchTranslation(page.text, newLanguage);
      setPage((prev) => (prev ? { ...prev, text: translatedText } : prev));
    } catch {
      setError("The page resists translation — the model isn't reachable.");
    } finally {
      setLoading(false);
    }
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

  // Reads `text` aloud on the persistent audio element. Only reads state via
  // refs, never closed-over component state, so it stays correct whether
  // called from a fresh click handler or from the mount-time 'ended' listener.
  async function speak(text: string) {
    const mySessionId = sessionIdRef.current;
    const audio = audioRef.current;
    if (!audio) return;

    setSpeechState("loading");
    setError(null);
    spokenTextRef.current = text;
    try {
      const blob = await fetchSpeech(text);
      if (sessionIdRef.current !== mySessionId) return;

      const url = URL.createObjectURL(blob);
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = url;

      audio.src = url;
      await audio.play();
    } catch {
      if (sessionIdRef.current === mySessionId) {
        setSpeechState("idle");
        setError("The page resists being read aloud — the speech backend isn't reachable.");
      }
    }
  }

  // Kicks off the one-page-ahead prefetch for `forPage`, unless one is
  // already in flight/done for that exact page. Superseded results (the
  // generation counter no longer matches once they resolve) get their audio
  // URL revoked instead of leaking, since no one will consume them.
  function ensurePrefetchFor(forPage: PageState) {
    if (prefetchRef.current?.forPageText === forPage.text) return;
    const myGen = ++prefetchGenRef.current;
    const { mode: currentMode, language: currentLanguage, skeleton: currentSkeleton } = latestRef.current;
    const resultPromise = prefetchNext(forPage, currentMode, currentLanguage, currentSkeleton).then((result) => {
      if (prefetchGenRef.current !== myGen && result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
      return result;
    });
    prefetchRef.current = { forPageText: forPage.text, resultPromise };
  }

  // Plays audio that was already fetched (by prefetchNext), so there's no
  // network round trip between one page ending and the next starting.
  function playPrefetchedAudio(url: string, text: string) {
    const audio = audioRef.current;
    if (!audio) return;
    spokenTextRef.current = text;
    if (audioObjectUrlRef.current && audioObjectUrlRef.current !== url) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
    }
    audioObjectUrlRef.current = url;
    audio.src = url;
    void audio.play().catch(() => {
      setSpeechState("idle");
      setError("The page resists being read aloud — the speech backend isn't reachable.");
    });
  }

  // Fires when a read-aloud finishes and auto-advance is on: turns the page
  // forward and, if the new page is in English, keeps reading — chaining
  // hands-free through the book. Uses the prefetched next page/audio when
  // one is ready (the common case, since ensurePrefetchFor starts it as soon
  // as the current page begins playing), falling back to fetching on the
  // spot otherwise. Reads/writes only via refs and setState, so it's safe to
  // be called from a listener registered once at mount.
  async function autoAdvanceTurn() {
    const mySessionId = sessionIdRef.current;
    const { page: currentPage, mode: currentMode, language: currentLanguage, skeleton: currentSkeleton } = latestRef.current;
    if (!currentPage) return;

    const pending = prefetchRef.current;
    const usingPending = pending?.forPageText === currentPage.text;
    if (usingPending) prefetchRef.current = null;

    setLoading(true);
    setError(null);
    const result = usingPending
      ? await pending!.resultPromise
      : await prefetchNext(currentPage, currentMode, currentLanguage, currentSkeleton);
    if (sessionIdRef.current === mySessionId) setLoading(false);

    if (sessionIdRef.current !== mySessionId) {
      if (result?.audioUrl) URL.revokeObjectURL(result.audioUrl);
      return;
    }
    if (!result) {
      setError("The book resists turning — the model isn't reachable.");
      return;
    }

    setPage(result.page);
    setSkeleton(result.skeleton);
    if (result.audioUrl) {
      playPrefetchedAudio(result.audioUrl, result.page.text);
    } else if (currentLanguage === "en") {
      void speak(result.page.text);
    }
  }

  function toggleSpeech() {
    if (!page) return;
    const audio = audioRef.current;
    if (!audio) return;

    const sameText = spokenTextRef.current === page.text;
    if (sameText && speechState === "playing") {
      audio.pause();
      return;
    }
    if (sameText && speechState === "paused") {
      void audio.play();
      return;
    }
    if (language === "en") {
      void speak(page.text);
    }
  }

  return (
    <main className="scene">
      <div className="toolbar">
        <ModeToggle mode={mode} disabled={loading} onChange={changeMode} />
        <LanguageToggle language={language} disabled={loading} onChange={changeLanguage} />
        <SpeechControls
          state={speechState}
          canStart={!!page && language === "en"}
          autoAdvance={autoAdvance}
          onTogglePlay={toggleSpeech}
          onToggleAutoAdvance={setAutoAdvance}
        />
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
