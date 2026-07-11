import Link from "next/link";
import { formatArchiveDate } from "@/lib/format";
import type { ArchivedPromptSummary } from "@/types";
import styles from "./ArchiveDayCard.module.css";

interface ArchiveDayCardProps {
  day: ArchivedPromptSummary;
}

export function ArchiveDayCard({ day }: ArchiveDayCardProps) {
  return (
    <Link href={`/archive/${day.id}`} className={styles.card}>
      <span className={styles.date}>{formatArchiveDate(day.id)}</span>
      <p className={styles.prompt}>{day.text}</p>
      <span className={styles.count}>
        {day.entryCount} {day.entryCount === 1 ? "story" : "stories"}
      </span>
    </Link>
  );
}
