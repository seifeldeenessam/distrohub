const TINTS = ["#0e6e55", "#2c4a7a", "#7a3e2c", "#5b3f86", "#6b6a1f", "#1f6470", "#8a2f55"];

/** App icon, or a monogram tile when the creator hasn't set one. */
export function AppIcon({ name, iconUrl, size = 56 }: { name: string; iconUrl?: string | null; size?: number }) {
  const radius = Math.round(size * 0.225);
  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl} alt="" width={size} height={size} className="shrink-0 object-cover" style={{ borderRadius: radius }} />;
  }
  const tint = TINTS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center font-display font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, background: tint, fontSize: size * 0.44 }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}
