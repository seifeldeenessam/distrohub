// Distrohub brand mark: the white rocket on the Citrus Peel gradient tile (public/brand/rocket.svg).
const FILLS = ['M186.667 278.567C200.639 242.319 218.232 207.573 239.18 174.856C239.18 174.856 150.433 145.186 107.898 173.543C69.8258 199.011 55.3848 278.567 55.3848 278.567H186.667Z', 'M239.18 174.856C218.232 207.573 200.639 242.319 186.667 278.567L265.436 357.336C302.109 343.379 337.293 325.787 370.462 304.823C507.52 212.927 528 87.423 528 16.0065C470.306 15.6487 413.48 30.057 362.926 57.8611C312.373 85.6652 269.773 125.94 239.18 174.856Z', 'M265.436 357.336V488.616C265.436 488.616 344.993 474.175 370.462 436.104C398.819 393.569 370.462 304.823 370.462 304.823C337.293 325.787 302.109 343.379 265.436 357.336Z', 'M68.513 396.72C29.1284 429.802 16.0002 528 16.0002 528C16.0002 528 114.199 514.872 147.282 475.488C165.924 453.433 165.662 419.562 144.919 399.083C134.713 389.342 121.27 383.713 107.168 383.277C93.0669 382.841 79.3011 387.628 68.513 396.72Z'];
const OUTLINE = 'M265.436 357.336V488.616C265.436 488.616 344.993 474.175 370.462 436.104C398.819 393.569 370.462 304.823 370.462 304.823M265.436 357.336C302.109 343.379 337.293 325.787 370.462 304.823M265.436 357.336L186.667 278.567M186.667 278.567C200.639 242.319 218.232 207.573 239.18 174.856C269.773 125.94 312.373 85.6652 362.926 57.8611C413.48 30.057 470.306 15.6487 528 16.0065C528 87.423 507.52 212.927 370.462 304.823M186.667 278.567H55.3848C55.3848 278.567 69.8258 199.011 107.898 173.543C150.433 145.186 239.18 174.856 239.18 174.856M68.513 396.72C29.1284 429.802 16.0002 528 16.0002 528C16.0002 528 114.199 514.872 147.282 475.488C165.924 453.433 165.662 419.562 144.919 399.083C134.713 389.342 121.27 383.713 107.168 383.277C93.0669 382.841 79.3011 387.628 68.513 396.72Z';

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1080 1080" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="dh-tile" x1="0" y1="0" x2="1080" y2="1080" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F37335" />
          <stop offset="1" stopColor="#FDC830" />
        </linearGradient>
        <linearGradient id="dh-flame" x1="1.5" y1="543" x2="542" y2="3.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4B1F" />
          <stop offset="1" stopColor="#FF9068" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1080" rx="240" fill="url(#dh-tile)" />
      <g transform="translate(268 268)">
        {FILLS.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill="url(#dh-flame)" />
        ))}
        <path d={OUTLINE} fill="none" stroke="#fff" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-xl font-bold tracking-tight">Distrohub</span>
    </span>
  );
}
