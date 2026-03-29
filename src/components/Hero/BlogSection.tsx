import styles from './BlogSection.module.css';
import Link from 'next/link';

const blogs = [
  {
    title: "How to Choose the Right Backlink for Your Niche",
    excerpt: "Learn the key metrics that actually move the needle in SEO ranking beyond just DR.",
    date: "Mar 25, 2026",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "The State of Backlink Marketplaces in 2026",
    excerpt: "Why organic traffic is becoming the absolute gold standard for backlink evaluation.",
    date: "Mar 22, 2026",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "5 Common Link Building Mistakes to Avoid",
    excerpt: "Stop wasting your budget on spammy placements. Here is what to look for instead.",
    date: "Mar 18, 2026",
    image: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Maximizing Your ROI on High-Authority Links",
    excerpt: "How to strategically place anchor text for the best possible ranking outcome.",
    date: "Mar 12, 2026",
    image: "https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&w=800&q=80"
  }
];

const BlogSection = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>SEO Insights & News</h2>
          <p className={styles.subtitle}>Latest trends and tips for growing your search authority.</p>
        </div>
        
        <div className={styles.grid}>
          {blogs.map((blog, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.imageWrapper}>
                <img src={blog.image} alt={blog.title} className={styles.image} />
              </div>
              <div className={styles.content}>
                <span className={styles.date}>{blog.date}</span>
                <h3 className={styles.blogTitle}>{blog.title}</h3>
                <p className={styles.excerpt}>{blog.excerpt}</p>
                <Link href="#" className={styles.readMore}>Read More</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
