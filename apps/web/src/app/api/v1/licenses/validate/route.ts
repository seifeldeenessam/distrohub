import { validateLicense } from '@/lib/licenses';
import { handleLicenseRequest } from '../_shared';

export async function POST(req: Request) {
	return handleLicenseRequest(req, 'validate', ({ appId, licenseKey, deviceId }) => validateLicense({ appId, key: licenseKey, deviceId }));
}
