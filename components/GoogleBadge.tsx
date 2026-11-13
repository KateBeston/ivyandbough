"use client";

import Script from "next/script";

// Google Merchant Center store badge. Google only shows it once the store has ratings.
// Sits bottom left, because the help chat button is bottom right.
export function GoogleBadge() {
  return (
    <Script
      id="merchantWidgetScript"
      src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
      strategy="lazyOnload"
      onLoad={() => {
        const w = window as unknown as { merchantwidget?: { start: (o: object) => void } };
        w.merchantwidget?.start({ merchant_id: 5903440721, position: "LEFT_BOTTOM", region: "AU" });
      }}
    />
  );
}
