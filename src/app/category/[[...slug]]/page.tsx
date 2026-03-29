import { api } from "@/lib/api";
import { notFound } from 'next/navigation';
import CategorySidebar from '@/components/Category/CategorySidebar';
import CategoryBreadcrumbs from '@/components/Category/CategoryBreadcrumbs';
import Link from 'next/link';
import ListingGrid from "@/components/Marketplace/ListingGrid";
import styles from './CategoryPage.module.css';

interface Props {
  params: {
    slug?: string[];
  };
}

// Mock listings for demonstration
const mockListings = [
  { id: 1, name: "Pro Website Development", title: "I will build a professional Next.js site", price: 499, niche: "Web Dev", seller: "Alex Dev", rating: 4.9, reviews: 124, traffic: "12k", dr: 75 },
  { id: 2, name: "Brand Identity", title: "I will design a unique brand logo", price: 250, niche: "Graphics", seller: "Sarah Creative", rating: 5.0, reviews: 89, traffic: "8k", dr: 68 },
  { id: 3, name: "SEO Audit", title: "I will perform a deep SEO audit", price: 150, niche: "SEO", seller: "Mark SEO", rating: 4.8, reviews: 210, traffic: "25k", dr: 82 },
];

export default async function CategoryPage({ params }: { params: { slug?: string[] } }) {
  const slugArray = params.slug || [];
  const currentSlug = slugArray[slugArray.length - 1];
  
  let currentCategory: any = null;
  let listings: any[] = [];
  const allCategories: any[] = await api('/api/categories');

  try {
    if (currentSlug) {
      currentCategory = await api(`/api/categories/${currentSlug}`);
      // In a real scenario, we'd also fetch listings for this category
      listings = await api(`/api/listings/`); // Placeholder for filtered listings
    }
  } catch (error) {
    console.error("Failed to fetch category data:", error);
  }

  // If no category found and we are not at the root /category
  if (!currentCategory && slugArray.length > 0) {
    notFound();
  }

  return (
    <div className={styles.layout}>
      <CategorySidebar categories={allCategories as any} />
      
      <main className={styles.main}>
        <div className="container">
          <CategoryBreadcrumbs segments={slugArray} categoryTree={allCategories as any} />

          {currentCategory ? (
            <>
              <div className={styles.hero}>
                {currentCategory.banner && (
                  <div className={styles.bannerWrapper}>
                    <img src={currentCategory.banner} alt={currentCategory.name} className={styles.banner} />
                  </div>
                )}
                <h1 className={styles.title}>{currentCategory.name}</h1>
                <p className={styles.subtitle}>{currentCategory.description || `Explore professional ${currentCategory.name.toLowerCase()} services.`}</p>
                {!(currentCategory.children && currentCategory.children.length > 0) && (
                   <button className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                    How it works
                   </button>
                )}
              </div>

              {(currentCategory as any).children && (currentCategory as any).children.length > 0 ? (
                <div className={styles.subcategoryGrid}>
                  <h2 className={styles.sectionTitle}>Explore {currentCategory.name}</h2>
                  <div className={styles.grid}>
                    {(currentCategory as any).children?.map((sub: any) => (
                      <Link 
                        key={sub.slug} 
                        href={`/category/${slugArray.join('/')}/${sub.slug}`}
                        className={styles.subCard}
                      >
                        <div className={styles.subCardTop}>
                           <div className={styles.placeholderImg}></div>
                        </div>
                        <div className={styles.subCardBottom}>
                           <h3 className={styles.subName}>{sub.name}</h3>
                           <span className={styles.arrow}>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.marketplaceView}>
                  <div className={styles.filters}>
                    <span className={styles.listingCount}>1,234 services available</span>
                    <select className={styles.sortSelect}>
                      <option>Relevance</option>
                      <option>Newest Arrivals</option>
                      <option>Best Selling</option>
                    </select>
                  </div>
                  <div className={styles.listingGrid}>
                    <ListingGrid listings={listings} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.allCategories}>
              <h1 className={styles.title}>All Categories</h1>
              <div className={styles.allGrid}>
                {allCategories.map((cat: any) => (
                  <Link key={cat.slug} href={`/category/${cat.slug}`} className={styles.allCard}>
                    <span className={styles.allIcon}>{cat.icon}</span>
                    <h3 className={styles.allName}>{cat.name}</h3>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
