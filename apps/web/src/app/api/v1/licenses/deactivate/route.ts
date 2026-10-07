import { deactivateLicense } from '@/lib/licenses';
import { handleLicenseRequest } from '../_shared';

export async function POST(req: Request) {
	return handleLicenseRequest(req, 'deactivate', ({ appId, licenseKey, deviceId }) => deactivateLicense({ appId, key: licenseKey, deviceId }));
}
