"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArchiveDayCard } from "@/components/ArchiveDayCard";
import { Wordmark } from "@/components/Wordmark";
import type { ArchivedPromptSummary } from "@/types";
import styles from "./archive.module.css";

type LoadState = "loading" | "ready" | "error";

export default function ArchiveIndexPage() {
  const [days, setDays] = useState<ArchivedPromptSummary[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  useEffect(() => {
    document.title = "The archive · Six Words Live";
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/archive", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("archive fetch failed");
        return response.json() as Promise<{ days: ArchivedPromptSummary[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setDays(data.days);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.topBar}>
        <Wordmark />
        <Link href="/" className={styles.backLink}>
          &larr; Back to today
        </Link>
      </div>

      <h1 className={styles.heading}>The archive</h1>
      <p className={styles.subheading}>Every past day&rsquo;s prompt, frozen and sorted by the votes it earned.</p>

      {status === "error" ? (
        <p className={styles.error} role="alert">
          Couldn&rsquo;t load the archive. Try again shortly.
        </p>
      ) : status === "loading" ? (
        <div className={styles.skeleton} aria-hidden="true" />
      ) : days.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No past days yet</p>
          <p>Six Words Live just started &mdash; check back tomorrow for the first archived day.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {days.map((day) => (
            <li key={day.id}>
              <ArchiveDayCard day={day} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
