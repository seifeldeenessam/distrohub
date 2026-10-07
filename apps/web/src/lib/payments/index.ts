import 'server-only';
import { env } from '../env';
import { mockProvider } from './mock';
import { polarProvider } from './polar';

export function payments() {
	return env.paymentsProvider === 'polar' ? polarProvider : mockProvider;
}
