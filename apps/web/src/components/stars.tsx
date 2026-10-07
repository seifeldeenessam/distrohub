/** Read-only star rating, rounded to the nearest half star. */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
	const rounded = Math.round(rating * 2) / 2;
	return (
		<span className="inline-flex shrink-0 items-center gap-px" role="img" aria-label={`${formatRating(rating)} out of 5 stars`}>
			{[1, 2, 3, 4, 5].map((i) => (
				<Star key={i} size={size} fill={rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0} />
			))}
		</span>
	);
}

export function Star({ size, fill }: { size: number; fill: 0 | 0.5 | 1 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="text-accent">
			<path d={STAR} className="fill-line" />
			{fill > 0 && <path d={STAR} fill="currentColor" style={fill === 0.5 ? { clipPath: 'inset(0 50% 0 0)' } : undefined} />}
		</svg>
	);
}

export const formatRating = (rating: number) => (Math.round(rating * 10) / 10).toFixed(1);

const STAR = 'M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z';
