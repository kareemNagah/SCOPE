export function MeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div
        className="orb"
        style={{
          width: 620, height: 620, left: "-8%", top: "18%",
          background: "radial-gradient(circle at 30% 30%, var(--scope-purple), transparent 65%)",
          animation: "mesh-float-slow 18s ease-in-out infinite",
        }}
      />
      <div
        className="orb"
        style={{
          width: 720, height: 720, right: "-10%", top: "-8%",
          background: "radial-gradient(circle at 60% 40%, var(--scope-violet), transparent 65%)",
          animation: "mesh-float 22s ease-in-out infinite",
        }}
      />
      <div
        className="orb"
        style={{
          width: 560, height: 560, right: "-6%", bottom: "-10%",
          background: "radial-gradient(circle at 50% 50%, var(--scope-blue), transparent 65%)",
          animation: "mesh-float-slow 26s ease-in-out infinite",
        }}
      />
      <div
        className="orb"
        style={{
          width: 380, height: 380, left: "12%", bottom: "-6%",
          background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--scope-pink) 60%, white), transparent 70%)",
          opacity: 0.55,
          animation: "mesh-float 30s ease-in-out infinite",
        }}
      />
    </div>
  );
}
