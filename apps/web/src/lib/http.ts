import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: {
        code: "invalid_request",
        message: error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
      },
    },
    { status: 400 },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
