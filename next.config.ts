import type { NextConfig } from "next";

/**
 * Static export build — the output in `out/` is plain HTML/CSS/JS that runs
 * on GitHub Pages without any server. Set NEXT_PUBLIC_BASE_PATH (e.g.
 * "/my-repo") only when deploying from a project site instead of a user site.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
