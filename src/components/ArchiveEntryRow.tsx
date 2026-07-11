import type { ArchivedEntry } from "@/types";
import styles from "./ArchiveEntryRow.module.css";

interface ArchiveEntryRowProps {
  entry: ArchivedEntry;
  rank: number;
}

// Read-only: no vote button, no "yours" badge, no relative timestamp — a
// frozen day has no viewer-relative state left to show.
export function ArchiveEntryRow({ entry, rank }: ArchiveEntryRowProps) {
  return (
    <li className={styles.row} data-top={rank === 1}>
      <span className={styles.rank}>{rank}</span>
      <p className={styles.body}>{entry.body}</p>
      <span className={styles.votes}>
        {entry.voteCount} {entry.voteCount === 1 ? "vote" : "votes"}
      </span>
    </li>
  );
}
