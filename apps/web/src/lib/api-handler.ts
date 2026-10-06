import "server-only";
import { authenticateApiKey } from "./api-auth";
import { db } from "./db";
import { apiError } from "./http";

type Ctx<P> = { params?: Promise<P> };

/** Wraps a developer-API route: requires a valid secret key and, when `appId` is in the path, ownership of that app. */
export function withApiKey<P extends Record<string, string>>(
  handler: (req: Request, ctx: { userId: string; params: P }) => Promise<Response>,
) {
  return async (req: Request, { params }: Ctx<P> = {}) => {
    const auth = await authenticateApiKey(req);
    if (!auth) return apiError(401, "unauthorized", "Pass a valid secret key: Authorization: Bearer dh_sk_...");
    const p = ((await params) ?? {}) as P;
    if (p.appId) {
      const app = await db.app.findFirst({ where: { id: p.appId, ownerId: auth.userId }, select: { id: true } });
      if (!app) return apiError(404, "app_not_found", "No app with this id in your account.");
    }
    return handler(req, { userId: auth.userId, params: p });
  };
}
