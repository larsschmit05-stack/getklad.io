export default function CanvasLoading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          border: "2px solid var(--klad-paper3, #e3ddd5)",
          borderTopColor: "var(--klad-ink, #1a1814)",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
