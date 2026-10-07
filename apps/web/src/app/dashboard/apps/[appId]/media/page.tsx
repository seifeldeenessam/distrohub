import { requireOwnedApp } from '@/lib/auth';
import { listMedia, MAX_MEDIA_PER_APP, mediaUrl } from '@/lib/media';
import { MediaActions, UploadMedia } from './upload';

export default async function MediaPage({ params }: PageProps<'/dashboard/apps/[appId]/media'>) {
	const { appId } = await params;
	const { app } = await requireOwnedApp(appId);
	const media = await listMedia(appId);

	return (
		<div className="grid gap-12 md:grid-cols-[1fr_320px]">
			<section>
				<h2 className="text-xl font-semibold">Screenshots and videos</h2>
				<p className="text-muted mt-1">Shown at the top of the product page, in this order. The first one is the cover.</p>
				{media.length === 0 ? (
					<p className="panel text-muted mt-6 p-6">No media yet. Add screenshots or a short demo video so buyers can see what they get.</p>
				) : (
					<ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
						{media.map((m, i) => (
							<li key={m.id} className="panel overflow-hidden">
								<div className="bg-line relative aspect-video">
									{m.kind === 'VIDEO' ? (
										<video src={`${mediaUrl(m.id)}#t=0.1`} preload="metadata" muted className="h-full w-full object-cover" />
									) : (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={mediaUrl(m.id)} alt={`${app.name} screenshot ${i + 1}`} className="h-full w-full object-cover" />
									)}
									{(i === 0 || m.kind === 'VIDEO') && <span className="bg-surface absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold">{i === 0 ? 'Cover' : 'Video'}</span>}
								</div>
								<MediaActions appId={appId} mediaId={m.id} first={i === 0} last={i === media.length - 1} />
							</li>
						))}
					</ul>
				)}
			</section>
			<section>
				<h2 className="text-xl font-semibold">Add media</h2>
				<UploadMedia appId={appId} remaining={MAX_MEDIA_PER_APP - media.length} />
			</section>
		</div>
	);
}
