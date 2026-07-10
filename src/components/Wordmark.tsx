import styles from "./Wordmark.module.css";

export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      Six Words <span className={styles.live}>Live</span>
      <span className={styles.dot} aria-hidden="true" />
    </span>
  );
}
