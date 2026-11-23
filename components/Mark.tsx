/* App icon drawn with ImageResponse (no CSS variables available there). */
export function Mark({ px }: { px: number }) {
  return (
    <div style={{ width: px, height: px, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: px * 0.72, height: px * 0.72, borderRadius: px * 0.2, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={px * 0.46} height={px * 0.46} viewBox="0 0 24 24" fill="none">
          <path d="M3 13h4l2.5-6 4 11 2.5-5H21" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
