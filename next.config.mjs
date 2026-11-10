const supabase = "https://pexlozjdgwrygzwiaivm.supabase.co";
const portal = "https://ivy-and-bough-portal.vercel.app";
const csp = (frameAncestors) => [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://www.googletagmanager.com https://challenges.cloudflare.com https://js.stripe.com https://*.js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${supabase} https://maps.googleapis.com https://maps.gstatic.com https://www.googletagmanager.com https://*.google-analytics.com https://*.stripe.com`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${supabase} https://maps.googleapis.com https://places.googleapis.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://api.stripe.com https://*.stripe.com`,
  "frame-src https://challenges.cloudflare.com https://js.stripe.com https://*.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${frameAncestors}`,
  "upgrade-insecure-requests",
].join("; ");
const shared = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), serial=(), bluetooth=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), display-capture=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

export default {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/((?!preview/).*)", headers: [...shared, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: csp("'none'") }] },
      { source: "/preview/:path*", headers: [...shared, { key: "Content-Security-Policy", value: csp(portal) }, { key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  images: {
    qualities: [75, 85],
    remotePatterns: [{ protocol: "https", hostname: "pexlozjdgwrygzwiaivm.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async redirects() {
    return [
      { source: "/journal", destination: "/the-christmas-edit", permanent: true },
      { source: "/journal/:slug", destination: "/the-christmas-edit/:slug", permanent: true },
      { source: "/themes/:slug", destination: "/collections/:slug", permanent: true },
      { source: "/collections/modern", destination: "/collections/silent-night", permanent: true },
      { source: "/shop/outdoor-decorations", destination: "/shop/outdoor", permanent: true },
      { source: "/shop/stockings-textiles", destination: "/shop/stockings", permanent: true },
    ];
  },
};
