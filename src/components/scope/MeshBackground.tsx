import { GradientBlur } from "@/components/ui/gradient-blur";

export function MeshBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 10% 20%, rgba(184, 104, 232, 0.04), transparent 45%),
          radial-gradient(circle at 90% 80%, rgba(115, 182, 252, 0.06), transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(252, 119, 164, 0.03), transparent 40%),
          oklch(0.985 0.005 280)
        `,
      }}
    >
      <GradientBlur />
    </div>
  );
}



