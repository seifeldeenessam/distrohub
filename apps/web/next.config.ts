import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Creator sign-up lives on the docs page; old links still land there.
  async redirects() {
    return [{ source: "/register", destination: "/docs#get-started", permanent: true }];
  },
};

export default nextConfig;
