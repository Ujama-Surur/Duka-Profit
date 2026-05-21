import styles from "./LoadingSkeleton.module.css";

export function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div
        className={styles.skeletonLine}
        style={{ height: 20, marginBottom: 12, width: "60%" }}
      />
      <div
        className={styles.skeletonLine}
        style={{ height: 16, marginBottom: 8 }}
      />
      <div
        className={styles.skeletonLine}
        style={{ height: 16, width: "80%" }}
      />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className={styles.skeleton}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <div
            className={styles.skeletonLine}
            style={{ height: 16, width: "20%" }}
          />
          <div
            className={styles.skeletonLine}
            style={{ height: 16, width: "30%" }}
          />
          <div
            className={styles.skeletonLine}
            style={{ height: 16, width: "25%" }}
          />
          <div
            className={styles.skeletonLine}
            style={{ height: 16, width: "25%" }}
          />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ columns = 3, items = 6 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
        gap: 16,
      }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, width = "100%" }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonLine}
          style={{
            height: 14,
            marginBottom: 8,
            width: i === lines - 1 ? "80%" : width,
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }) {
  return (
    <div
      className={styles.skeletonLine}
      style={{ height: size, width: size, borderRadius: "50%" }}
    />
  );
}
