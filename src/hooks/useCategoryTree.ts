import { useState, useEffect, useRef } from 'react';

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  level?: number;
  is_active?: boolean;
  gig_count?: number;
  children: CategoryNode[];
};

export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Cache object to store popular services for subcategories
  const [servicesCache, setServicesCache] = useState<Record<string, CategoryNode[]>>({});
  
  // Ref to track active fetches so we don't duplicate requests
  const fetchingRefs = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCategories() {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/categories/`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        
        setTree(data);
      } catch (err) {
        console.error("Failed to load category tree", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const prefetchServices = async (subCatSlug: string) => {
    if (!subCatSlug) return;
    if (servicesCache[subCatSlug] || fetchingRefs.current.has(subCatSlug)) return;
    
    fetchingRefs.current.add(subCatSlug);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/categories/${subCatSlug}/popular-services`;
      const response = await fetch(url);
      if (!response.ok) return;
      
      const tags = await response.json();
      // Map tags into the pseudo CategoryNode shape expected by MegaMenu
      const pseudoChildren: CategoryNode[] = tags.map((t: any) => ({
        id: t.name,
        name: t.name,
        slug: encodeURIComponent(t.name), 
        children: []
      }));
      
      setServicesCache(prev => ({ ...prev, [subCatSlug]: pseudoChildren }));
    } catch (e) {
      console.error(e);
    } finally {
      fetchingRefs.current.delete(subCatSlug);
    }
  };

  return { tree, loading, prefetchServices, servicesCache };
}


