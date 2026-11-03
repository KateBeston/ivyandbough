export default {
  images: { qualities: [75, 85] },
  async redirects() {
    return [
      { source: "/themes/:slug", destination: "/collections/:slug", permanent: true },
      { source: "/shop/outdoor-decorations", destination: "/shop/outdoor", permanent: true },
      { source: "/shop/stockings-textiles", destination: "/shop/stockings", permanent: true },
    ];
  },
};
