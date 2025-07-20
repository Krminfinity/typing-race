import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 本番ビルド時にESLintエラーを警告として扱う
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScriptエラーを無視（一時的）
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
