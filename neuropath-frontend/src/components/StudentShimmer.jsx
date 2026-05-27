import "../styles/StudentShimmer.css";

export default function StudentShimmer({ rows = 5, variant = "table" }) {
  const items = Array.from({ length: rows });

  if (variant === "list") {
    return (
      <div className="shimmer-list">
        {items.map((_, i) => (
          <div key={i} className="shimmer-list-item">
            <div className="shimmer-avatar shimmer-pulse" />
            <div className="shimmer-list-lines">
              <div
                className="shimmer-line shimmer-pulse"
                style={{ width: "55%" }}
              />
              <div
                className="shimmer-line shimmer-pulse"
                style={{ width: "35%" }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="shimmer-table-wrap">
      <div className="shimmer-table-header shimmer-pulse" />
      {items.map((_, i) => (
        <div key={i} className="shimmer-table-row">
          <div
            className="shimmer-cell shimmer-pulse"
            style={{ width: "10%" }}
          />
          <div
            className="shimmer-cell shimmer-pulse"
            style={{ width: "40%" }}
          />
          <div
            className="shimmer-cell shimmer-pulse"
            style={{ width: "20%" }}
          />
          <div
            className="shimmer-cell shimmer-pulse"
            style={{ width: "15%" }}
          />
        </div>
      ))}
    </div>
  );
}
