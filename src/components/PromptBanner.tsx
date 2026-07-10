import styles from "./PromptBanner.module.css";

interface PromptBannerProps {
  text: string | null;
}

// The one signature flourish per DESIGN.md: a hand-stamped squiggle under
// the day's prompt instead of a plain border. Reused as the loading
// skeleton shape so the empty/loading state isn't a blank area either.
export function PromptBanner({ text }: PromptBannerProps) {
  return (
    <div className={styles.banner}>
      <span className={styles.label}>Today&rsquo;s six words are about&hellip;</span>
      {text ? (
        <h1 className={styles.prompt}>
          {text}
          <Squiggle className={styles.squiggle} />
        </h1>
      ) : (
        <div className={styles.skeleton} aria-hidden="true" />
      )}
    </div>
  );
}

function Squiggle({ className }: { className: string | undefined }) {
  return (
    <svg className={className} viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 8 C 20 2, 35 2, 50 8 S 80 14, 100 8 S 130 2, 150 8 S 180 14, 198 7" />
    </svg>
  );
}
