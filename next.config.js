/** @type {import('next').NextConfig} */

// Baseline security response headers applied to every route. These are the
// broadly-compatible set that hardens the app without risking breakage:
//   - HSTS: force HTTPS for a year (incl. subdomains). Browsers ignore it on
//     plain HTTP/localhost, so it is safe in dev.
//   - X-Content-Type-Options: stop MIME sniffing.
//   - X-Frame-Options + frame-ancestors: block clickjacking via framing.
//   - Referrer-Policy: don't leak full URLs cross-origin.
//   - Permissions-Policy: drop powerful features the app never uses.
//   - X-DNS-Prefetch-Control: allow prefetch (perf) but make it explicit.
// A full script/style CSP is intentionally omitted: this app relies on Next.js
// inline bootstrap scripts, Pusher websockets, the Cloudinary upload widget, and
// OAuth redirects, so a restrictive policy needs nonce wiring and per-source
// tuning that must be validated against a running server. We ship a
// frame-ancestors-only CSP (purely additive clickjacking defense) instead.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const CDN_BASE_URL = process.env.CDN_BASE_URL || "";

let cdnHostname = "";
if (CDN_BASE_URL) {
  try { cdnHostname = new URL(CDN_BASE_URL).hostname; } catch { cdnHostname = ""; }
}

const cdnHeaders = CDN_BASE_URL
  ? [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Range, Content-Type" },
      { key: "Vary", value: "Accept-Encoding" },
    ]
  : [];

const nextConfig = {
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      ...(cdnHostname
        ? [{ protocol: "https", hostname: cdnHostname }]
        : []),
    ],
  },
  assetPrefix: CDN_BASE_URL || undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...(CDN_BASE_URL
        ? [{ source: "/api/drive/file/:path*", headers: cdnHeaders }]
        : []),
    ];
  },
};

module.exports = nextConfig;
