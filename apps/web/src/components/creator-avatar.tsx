/** Monogram for a creator on the brand gradient (creators have no profile photo). */
export function CreatorAvatar({ name, size = 56 }: { name: string; size?: number }) {
	return (
		<div aria-hidden className="bg-brand text-on-brand flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, fontSize: size * 0.42 }}>
			{name.trim().charAt(0).toUpperCase()}
		</div>
	);
}
