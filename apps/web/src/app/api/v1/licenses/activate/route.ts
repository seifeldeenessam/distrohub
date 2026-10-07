import { activateLicense } from '@/lib/licenses';
import { handleLicenseRequest } from '../_shared';

export async function POST(req: Request) {
	return handleLicenseRequest(req, 'activate', ({ appId, licenseKey, deviceId, deviceName }) => activateLicense({ appId, key: licenseKey, deviceId, deviceName }));
}
