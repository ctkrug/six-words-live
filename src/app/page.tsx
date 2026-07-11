"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { MuteToggle } from "@/components/MuteToggle";
import { PromptBanner } from "@/components/PromptBanner";
import { Wall, type SortMode } from "@/components/Wall";
import { Wordmark } from "@/components/Wordmark";
import { getStoredMute, playSound, setStoredMute } from "@/lib/sound";
import { annotateArrivals, seedSeenIds, type WallEntry } from "@/lib/wall";
import type { Entry } from "@/types";
import styles from "@/components/PageShell.module.css";

const POLL_INTERVAL_MS = 5000;

interface EntriesResponse {
  entries: Entry[];
  promptId: string;
}

export default function HomePage() {
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [sort, setSort] = useState<SortMode>("new");
  const [submitting, setSubmitting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [wallError, setWallError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const promptIdRef = useRef<string | null>(null);
  const sortRef = useRef<SortMode>("new");
  const wallErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMuted(getStoredMute());
  }, []);

  const loadPrompt = useCallback(async () => {
    try {
      const response = await fetch("/api/prompt", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { prompt: { text: string } };
      setPromptText(data.prompt.text);
    } catch {
      // A poll tick offline or mid-flake is a no-op; the next tick retries.
    }
  }, []);

  const loadEntries = useCallback(
    async (sortMode: SortMode, isInitial: boolean) => {
      try {
        const response = await fetch(`/api/entries?sort=${sortMode}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as EntriesResponse;

        if (promptIdRef.current !== null && data.promptId !== promptIdRef.current) {
          // UTC day rolled over mid-session: cross-fade into the fresh prompt
          // instead of animating every old entry away.
          seenIdsRef.current = seedSeenIds(data.entries);
          promptIdRef.current = data.promptId;
          setPromptId(data.promptId);
          setEntries(data.entries.map((entry) => ({ ...entry, justArrived: false })));
          setAnnouncement("A new prompt just started.");
          void loadPrompt();
          setNow(Date.now());
          return;
        }

        promptIdRef.current = data.promptId;
        setPromptId(data.promptId);

        if (isInitial) {
          seenIdsRef.current = seedSeenIds(data.entries);
          setEntries(data.entries.map((entry) => ({ ...entry, justArrived: false })));
        } else {
          const { entries: annotated, seenIds } = annotateArrivals(data.entries, seenIdsRef.current);
          seenIdsRef.current = seenIds;
          const arrivedCount = annotated.filter((entry) => entry.justArrived).length;
          if (arrivedCount > 0) {
            setAnnouncement(`${arrivedCount} new ${arrivedCount === 1 ? "story" : "stories"} just landed`);
            playSound("arrival");
          }
          setEntries(annotated);
        }
        setNow(Date.now());
      } catch {
        // A poll tick offline or mid-flake is a no-op; the next tick retries.
      }
    },
    [loadPrompt],
  );

  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);

  useEffect(() => {
    return () => {
      if (wallErrorTimeoutRef.current) clearTimeout(wallErrorTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    void loadPrompt();
    void loadEntries(sort, true);

    const interval = setInterval(() => {
      void loadEntries(sortRef.current, false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // Intentionally runs once on mount; sort changes are handled by the
    // dedicated handler below so we don't tear down/restart the poll timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSortChange(next: SortMode) {
    setSort(next);
    sortRef.current = next;
    void loadEntries(next, false);
  }

  function handleToggleMute() {
    setMuted((prev) => {
      const next = !prev;
      setStoredMute(next);
      return next;
    });
  }

  async function handleSubmit(body: string): Promise<string | null> {
    setSubmitting(true);
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as { entry?: Entry; error?: string };
      if (!response.ok || !data.entry) {
        return data.error ?? "Something went wrong. Try again.";
      }
      seenIdsRef.current.add(data.entry.id);
      setEntries((prev) => [{ ...data.entry!, justArrived: false }, ...prev]);
      playSound("submit");
      return null;
    } catch {
      return "Couldn't reach the server. Check your connection and try again.";
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(entryId: string) {
    const target = entries.find((entry) => entry.id === entryId);
    if (!target || target.votedByMe) return;

    setEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, voteCount: entry.voteCount + 1, votedByMe: true } : entry)),
    );
    playSound("vote");

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      const data = (await response.json()) as { voteCount?: number; error?: string };
      if (!response.ok || data.voteCount === undefined) {
        throw new Error(data.error ?? "Vote failed");
      }
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, voteCount: data.voteCount!, votedByMe: true } : entry)),
      );
      if (wallErrorTimeoutRef.current) {
        clearTimeout(wallErrorTimeoutRef.current);
        wallErrorTimeoutRef.current = null;
      }
      setWallError(null);
    } catch (error) {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, voteCount: target.voteCount, votedByMe: target.votedByMe } : entry)),
      );
      setWallError(error instanceof Error ? error.message : "Vote failed. Try again.");
      if (wallErrorTimeoutRef.current) clearTimeout(wallErrorTimeoutRef.current);
      wallErrorTimeoutRef.current = setTimeout(() => setWallError(null), 3000);
    }
  }

  const ownEntry = entries.find((entry) => entry.isMine) ?? null;

  return (
    <main className={styles.container}>
      <div className={styles.topBar}>
        <Wordmark />
        <div className={styles.topBarActions}>
          <Link href="/archive" className={styles.archiveLink}>
            Archive
          </Link>
          <MuteToggle muted={muted} onToggle={handleToggleMute} />
        </div>
      </div>

      <PromptBanner text={promptText} />

      <Composer ownEntry={ownEntry} submitting={submitting} onSubmit={handleSubmit} />

      {wallError ? (
        <p className={styles.errorBanner} role="alert">
          {wallError}
        </p>
      ) : null}

      <Wall
        entries={entries}
        sort={sort}
        now={now ?? Date.now()}
        announcement={announcement}
        onSortChange={handleSortChange}
        onVote={handleVote}
      />
    </main>
  );
}
