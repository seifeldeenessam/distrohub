import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Creator sign-up lives on the docs page; old links still land there. /developers was renamed /creators.
	async redirects() {
		return [
			{ source: '/register', destination: '/docs#get-started', permanent: true },
			{ source: '/developers/:id', destination: '/creators/:id', permanent: true }
		];
	}
};

export default nextConfig;
