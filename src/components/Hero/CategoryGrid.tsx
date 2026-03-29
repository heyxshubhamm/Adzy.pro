"use client";

import Link from 'next/link';
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import styles from "./CategoryGrid.module.css";

const CategoryGrid = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api("/api/categories/");
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) return null;
  const mainCategories = categories.slice(0, 8);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {mainCategories.map((cat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link href={`/category/${cat.slug}`} className={styles.card}>
                <div className={styles.icon}>{cat.icon || '📁'}</div>
                <span className={styles.name}>{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
