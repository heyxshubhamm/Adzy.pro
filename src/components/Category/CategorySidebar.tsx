'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CategoryNode } from '@/data/categories';
import styles from './CategorySidebar.module.css';
import { useState } from 'react';

interface Props {
  categories: CategoryNode[];
}

const CategorySidebar = ({ categories }: Props) => {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand based on current path
    const initial: Record<string, boolean> = {};
    categories.forEach(cat => {
      if (pathname.includes(cat.slug)) {
        initial[cat.slug] = true;
      }
    });
    return initial;
  });

  const toggle = (slug: string) => {
    setExpanded(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const renderNode = (node: CategoryNode, depth = 0, parentPath = '/category') => {
    const currentPath = `${parentPath}/${node.slug}`;
    const isActive = pathname === currentPath;
    const isExpanded = expanded[node.slug] || pathname.startsWith(currentPath);

    return (
      <div key={node.slug} className={styles.nodeWrapper}>
        <div 
          className={`${styles.node} ${isActive ? styles.active : ''}`}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
        >
          <Link href={currentPath} className={styles.link}>
            {node.name}
          </Link>
          {node.children && (
            <button className={styles.toggle} onClick={() => toggle(node.slug)}>
              <svg 
                className={isExpanded ? styles.rotated : ''}
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        {node.children && isExpanded && (
          <div className={styles.children}>
            {node.children.map(child => renderNode(child, depth + 1, currentPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>Categories</h3>
      <div className={styles.tree}>
        {categories.map(cat => renderNode(cat))}
      </div>
    </aside>
  );
};

export default CategorySidebar;
