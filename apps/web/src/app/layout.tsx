import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
// Monospace only for license keys and code samples, where character-by-character legibility matters.
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
	title: { default: 'Distrohub', template: '%s · Distrohub' },
	description: 'Apps, ebooks, templates and more from independent creators. Free or pay once, and keep the download.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
			<body className="min-h-dvh">{children}</body>
		</html>
	);
}
