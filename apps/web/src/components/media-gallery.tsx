'use client';

import { useState } from 'react';

export type GalleryItem = { id: string; kind: 'IMAGE' | 'VIDEO'; url: string };

/** Product page gallery: a large stage plus a thumbnail strip. */
export function MediaGallery({ items, name }: { items: GalleryItem[]; name: string }) {
	const [active, setActive] = useState(0);
	const current = items[active];
	if (!current) return null;

	return (
		<section aria-label={`${name} screenshots`} className="mt-10">
			<div className="border-line bg-surface overflow-hidden rounded-xl border">
				{current.kind === 'VIDEO' ? (
					<video key={current.id} src={current.url} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
				) : (
					<a href={current.url} target="_blank" rel="noopener" title="Open full size">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={current.url} alt={`${name} screenshot ${active + 1} of ${items.length}`} className="aspect-video w-full object-contain" />
					</a>
				)}
			</div>
			{items.length > 1 && (
				<ul className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
					{items.map((item, i) => (
						<li key={item.id} className="shrink-0 snap-start">
							<button
								type="button"
								onClick={() => setActive(i)}
								aria-label={`Show ${item.kind === 'VIDEO' ? 'video' : 'screenshot'} ${i + 1}`}
								aria-current={i === active}
								className={`bg-line relative block h-14 w-24 overflow-hidden rounded-md border-2 ${i === active ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}
							>
								{item.kind === 'VIDEO' ? (
									<>
										<video src={`${item.url}#t=0.1`} preload="metadata" muted className="h-full w-full object-cover" />
										<span aria-hidden className="absolute inset-0 flex items-center justify-center text-lg text-white drop-shadow">
											▶
										</span>
									</>
								) : (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
								)}
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
