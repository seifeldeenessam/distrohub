import { withApiKey } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { serializeApp } from '@/lib/serializers';
import { NextResponse } from 'next/server';

export const GET = withApiKey(async (_req, { userId }) => {
	const apps = await db.app.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } });
	return NextResponse.json({ data: apps.map(serializeApp) });
});
