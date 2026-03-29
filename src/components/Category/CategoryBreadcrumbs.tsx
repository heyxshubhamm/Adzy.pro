import Link from 'next/link';
import styles from './CategoryBreadcrumbs.module.css';
import { CategoryNode } from '@/data/categories';

interface Props {
  segments: string[];
  categoryTree: CategoryNode[];
}

const CategoryBreadcrumbs = ({ segments, categoryTree }: Props) => {
  const trail: { name: string; url: string }[] = [{ name: 'Adzy', url: '/' }];
  
  let currentNodes = categoryTree;
  let currentUrl = '/category';

  segments.forEach((slug, index) => {
    const node = currentNodes.find(n => n.slug === slug);
    if (node) {
      currentUrl += `/${slug}`;
      trail.push({ name: node.name, url: currentUrl });
      currentNodes = node.children || [];
    }
  });

  return (
    <nav className={styles.breadcrumbs}>
      {trail.map((item, i) => (
        <span key={i} className={styles.item}>
          {i > 0 && <span className={styles.separator}>/</span>}
          {i === trail.length - 1 ? (
            <span className={styles.current}>{item.name}</span>
          ) : (
            <Link href={item.url} className={styles.link}>{item.name}</Link>
          )}
        </span>
      ))}
    </nav>
  );
};

export default CategoryBreadcrumbs;
