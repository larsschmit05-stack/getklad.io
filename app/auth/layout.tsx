import AuthBackground from "./auth-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        backgroundColor: "var(--klad-paper)",
      }}
    >
      {/* Blurred canvas background */}
      <AuthBackground />

      {/* Foreground content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "16px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Logo & tagline */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                fontStyle: "italic",
                fontFamily: "var(--font-playfair), serif",
                color: "var(--klad-ink)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Klad
            </h1>
            <p
              style={{
                fontSize: "14px",
                fontFamily: "var(--font-dm-sans), sans-serif",
                color: "var(--klad-ink3)",
                marginTop: "4px",
              }}
            >
              AI canvas for solo builders
            </p>
          </div>

          {/* Auth card */}
          <div
            style={{
              backgroundColor: "var(--klad-paper)",
              border: "1px solid var(--klad-ink)",
              borderRadius: "8px",
              boxShadow: "4px 4px 0 var(--klad-ink)",
              padding: "28px",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
