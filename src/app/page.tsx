import Hero from "@/components/Hero/Hero";
import CategoryGrid from "@/components/Hero/CategoryGrid";
import FeaturedMarketplace from "@/components/Hero/FeaturedMarketplace";
import PopularServices from "@/components/Hero/PopularServices";
import FeatureHighlight from "@/components/Hero/FeatureHighlight";
import ExpertSourcing from "@/components/Hero/ExpertSourcing";
import FeaturedOn from "@/components/Hero/FeaturedOn";
import ProcessSteps from "@/components/Hero/ProcessSteps";
import WhyChooseAdzy from "@/components/Hero/WhyChooseAdzy";
import Reviews from "@/components/Hero/Reviews";
import BlogSection from "@/components/Hero/BlogSection";
import JoinCTA from "@/components/Hero/JoinCTA";
import FAQSection from "@/components/Hero/FAQSection";
import { api } from "@/lib/api";

async function getCategories() {
  try {
    return await api("/api/categories/");
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

export default async function Home() {
  const categories = await getCategories();

  return (
    <>
      <Hero categories={categories as any} />
      <CategoryGrid />
      <FeaturedMarketplace />
      <PopularServices />
      <FeatureHighlight />
      <ExpertSourcing />
      <FeaturedOn />
      <WhyChooseAdzy />
      <Reviews />
      <BlogSection />
      <JoinCTA />
      <FAQSection />
    </>
  );
}
