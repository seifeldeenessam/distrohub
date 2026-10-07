import { requireOwnedApp } from '@/lib/auth';
import { updateApp } from '../../../actions';
import { AppForm } from '../../../app-form';

export default async function SettingsPage({ params }: PageProps<'/dashboard/apps/[appId]/settings'>) {
	const { appId } = await params;
	const { app } = await requireOwnedApp(appId);
	return <AppForm action={updateApp.bind(null, app.id)} app={app} submitLabel="Save changes" />;
}
