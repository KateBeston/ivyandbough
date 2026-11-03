export default {
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
