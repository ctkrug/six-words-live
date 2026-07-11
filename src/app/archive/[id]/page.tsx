"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArchiveEntryRow } from "@/components/ArchiveEntryRow";
import { Wordmark } from "@/components/Wordmark";
import { formatArchiveDate } from "@/lib/format";
import type { ArchivedEntry, Prompt } from "@/types";
import shellStyles from "../archive.module.css";
import styles from "./day.module.css";

type LoadState = "loading" | "ready" | "not-found" | "error";

interface ArchiveDayResponse {
  prompt: Prompt;
  entries: ArchivedEntry[];
}

export default function ArchiveDayPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ArchiveDayResponse | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");

  useEffect(() => {
    document.title = data ? `${data.prompt.text} · Six Words Live archive` : "Six Words Live archive";
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/archive/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          if (!cancelled) setStatus("not-found");
          return null;
        }
        if (!response.ok) throw new Error("archive day fetch failed");
        return (await response.json()) as ArchiveDayResponse;
      })
      .then((json) => {
        if (cancelled || !json) return;
        setData(json);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <main className={shellStyles.container}>
      <div className={shellStyles.topBar}>
        <Wordmark />
        <Link href="/archive" className={shellStyles.backLink}>
          &larr; Back to the archive
        </Link>
      </div>

      {status === "loading" ? (
        <div className={shellStyles.skeleton} aria-hidden="true" />
      ) : status === "not-found" ? (
        <div className={shellStyles.empty}>
          <p className={shellStyles.emptyTitle}>No archived day here</p>
          <p>There&rsquo;s no record for {params.id}. It may not have happened yet.</p>
        </div>
      ) : status === "error" ? (
        <p className={shellStyles.error} role="alert">
          Couldn&rsquo;t load this day. Try again shortly.
        </p>
      ) : data ? (
        <>
          <span className={styles.date}>{formatArchiveDate(data.prompt.id)}</span>
          <h1 className={styles.prompt}>{data.prompt.text}</h1>

          {data.entries.length === 0 ? (
            <div className={shellStyles.empty}>
              <p className={shellStyles.emptyTitle}>Nobody wrote that day</p>
              <p>This prompt came and went with no stories on the wall.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {data.entries.map((entry, index) => (
                <ArchiveEntryRow key={entry.id} entry={entry} rank={index + 1} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </main>
  );
}
