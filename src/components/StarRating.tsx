interface Props {
  rating: number;
  count?: number;
}

export function StarRating({ rating, count }: Props) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", gap: 1 }}>
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f${i}`} style={{ color: "#f59e0b", fontSize: 14 }}>★</span>
        ))}
        {half && <span style={{ color: "#f59e0b", fontSize: 14 }}>½</span>}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>★</span>
        ))}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
        {Number(rating).toFixed(1)}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          ({count})
        </span>
      )}
    </div>
  );
}
