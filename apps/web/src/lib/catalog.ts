import "server-only";
import { db } from "./db";
import { ratingSummaries } from "./reviews";
import type { Prisma } from "@/generated/prisma/client";

/** Products buyers can see: published, with at least one uploaded release. */
export const LISTED: Prisma.AppWhereInput = { status: "PUBLISHED", releases: { some: { uploaded: true } } };

/** Listed products matching `where`, with the creator and rating summary each row needs. */
export async function findListed(args: {
  where?: Prisma.AppWhereInput;
  orderBy?: Prisma.AppOrderByWithRelationInput | Prisma.AppOrderByWithRelationInput[];
  take: number;
  skip?: number;
}) {
  const apps = await db.app.findMany({
    where: { AND: [LISTED, args.where ?? {}] },
    orderBy: args.orderBy ?? { createdAt: "desc" },
    take: args.take,
    skip: args.skip,
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      iconUrl: true,
      kind: true,
      platform: true,
      priceCents: true,
      currency: true,
      owner: { select: { id: true, name: true } },
    },
  });
  const ratings = await ratingSummaries(apps.map((a) => a.id));
  return apps.map((app) => ({ ...app, rating: ratings.get(app.id) }));
}

export type ListedProduct = Awaited<ReturnType<typeof findListed>>[number];
