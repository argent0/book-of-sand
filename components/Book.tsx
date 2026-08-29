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

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    latestRef.current = { page, mode, language, skeleton };
  });

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

  // Fires when a read-aloud finishes and auto-advance is on: turns the page
  // forward and, if the new page is in English, keeps reading — chaining
  // hands-free through the book. Reads/writes only via refs and setState, so
  // it's safe to be called from a listener registered once at mount.
  async function autoAdvanceTurn() {
    const mySessionId = sessionIdRef.current;
    const { page: currentPage, mode: currentMode, language: currentLanguage, skeleton: currentSkeleton } = latestRef.current;
    if (!currentPage) return;

    setLoading(true);
    setError(null);
    let next: PageState | null = null;
    let nextSkeleton: SkeletonState | null = null;
    try {
      ({ page: next, skeleton: nextSkeleton } = await fetchPage({
        currentPageText: currentPage.text,
        direction: "forward",
        jumpSize: "small",
        mode: currentMode,
        language: currentLanguage,
        skeleton: currentSkeleton,
      }));
    } catch {
      if (sessionIdRef.current === mySessionId) {
        setError("The book resists turning — the model isn't reachable.");
      }
    } finally {
      if (sessionIdRef.current === mySessionId) setLoading(false);
    }

    if (!next || sessionIdRef.current !== mySessionId) return;
    setPage(next);
    setSkeleton(nextSkeleton);
    if (currentLanguage === "en") {
      void speak(next.text);
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
