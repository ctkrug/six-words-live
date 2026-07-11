"use client";

import { useState } from "react";
import { countWords, isValidSixWordEntry } from "@/lib/prompts";
import type { Entry } from "@/types";
import styles from "./Composer.module.css";

interface ComposerProps {
  ownEntry: Entry | null;
  submitting: boolean;
  onSubmit: (body: string) => Promise<string | null>;
}

// `onSubmit` returns an error message on failure, or null on success — lets
// the parent own the network call and optimistic wall update while the
// composer only owns its own field/validation state.
export function Composer({ ownEntry, submitting, onSubmit }: ComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (ownEntry) {
    return (
      <div className={styles.doneCard}>
        <span className={styles.doneLabel}>You already wrote today&rsquo;s story</span>
        <p className={styles.doneEntry}>{ownEntry.body}</p>
      </div>
    );
  }

  const wordCount = countWords(body);
  const isReady = isValidSixWordEntry(body);
  const isOver = wordCount > 6;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidSixWordEntry(body) || submitting) return;
    setError(null);
    const message = await onSubmit(body.trim());
    if (message) {
      setError(message);
    } else {
      setBody("");
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <textarea
        className={styles.field}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          if (error) setError(null);
        }}
        placeholder="Write exactly six words against today's prompt&hellip;"
        aria-label="Your six-word story"
        aria-invalid={error ? "true" : "false"}
        data-invalid={Boolean(error)}
        maxLength={280}
      />
      <div className={styles.row}>
        <span className={styles.count} data-ready={isReady} data-over={isOver} aria-live="polite">
          {wordCount} / 6 words
        </span>
        <button type="submit" className={styles.submit} disabled={!isReady || submitting}>
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
