const links: Record<string, ((n: string) => string) | undefined> = {
  "australia post": (n) => `https://auspost.com.au/mypost/track/#/details/${n}`,
  startrack: (n) => `https://auspost.com.au/mypost/track/#/details/${n}`,
  aramex: (n) => `https://www.aramex.com.au/tools/track?l=${n}`,
  couriersplease: (n) => `https://www.couriersplease.com.au/tools-track/no/${n}`,
  sendle: (n) => `https://track.sendle.com/tracking?ref=${n}`,
  dhl: (n) => `https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`,
};

export function trackingUrl(carrier: string, number: string) {
  const build = links[carrier.trim().toLowerCase()];
  return build && number.trim() ? build(encodeURIComponent(number.trim())) : null;
}
