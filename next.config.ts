import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // The sample court imagery is SVG. Next refuses to optimise SVG by default
    // because a hostile SVG can carry script; these are our own generated files
    // and the CSP below neuters scripting regardless.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
