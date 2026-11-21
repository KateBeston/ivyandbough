import { Footer } from "@/components/Footer";
import { GoogleBadge } from "@/components/GoogleBadge";
import { Nav } from "@/components/Nav";
import { ReviewToast } from "@/components/ReviewToast";
import { forMenu, forMenuThemes, getOfferLinks, getStockedCategories, getThemes } from "@/lib/catalogue";
import { getEventAreas } from "@/lib/events";
import { getCampaignLink } from "@/lib/campaigns";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [themes, categories, offers, eventAreas, campaign] = await Promise.all([getThemes(), getStockedCategories(), getOfferLinks(), getEventAreas().catch(() => ({})), getCampaignLink()]);
  return (
    <>
      <Nav themes={forMenuThemes(themes)} categories={forMenu(categories)} offers={offers} eventAreas={eventAreas} campaign={campaign} solid />
      {children}
      <Footer />
      <GoogleBadge />
      <ReviewToast />
    </>
  );
}
