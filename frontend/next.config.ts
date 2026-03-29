import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true,  // Disabled - requires babel-plugin-react-compiler
  transpilePackages: [
    "survey-core",
    "survey-react-ui",
    "survey-creator-core",
    "survey-creator-react",
  ],
};

export default nextConfig;
