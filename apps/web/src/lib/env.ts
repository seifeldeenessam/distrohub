import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const env = {
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get secretKey() {
    const key = Buffer.from(required("APP_SECRET_KEY"), "base64");
    if (key.length !== 32) throw new Error("APP_SECRET_KEY must be 32 bytes, base64 encoded");
    return key;
  },
  get platformFeeBps() {
    return Number(process.env.PLATFORM_FEE_BPS ?? "1000");
  },
  get paymentsProvider(): "polar" | "mock" {
    if (process.env.PAYMENTS_PROVIDER === "polar") return "polar";
    // The mock checkout hands out licenses for free, so production must opt in explicitly.
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
      throw new Error("Set PAYMENTS_PROVIDER=polar in production (or ALLOW_MOCK_PAYMENTS=true for a demo).");
    }
    return "mock";
  },
  get storageDriver(): "s3" | "local" {
    return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
  },
  required,
};
