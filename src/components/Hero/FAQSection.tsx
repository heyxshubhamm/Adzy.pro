'use client';

import { useState } from 'react';
import styles from './FAQSection.module.css';

const faqs = [
  {
    question: "What makes Adzy.pro different from other backlink marketplaces?",
    answer: "Unlike many other platforms, we prioritize real organic traffic over artificial metrics like DA or DR. Every site in our marketplace is manually vetted to ensure it has a genuine audience and consistent search visibility."
  },
  {
    question: "How long does it typically take for a backlink to go live?",
    answer: "Our average publication time is 24 hours. Most sellers on Adzy.pro are highly responsive and prioritize our orders due to our strict quality and speed standards."
  },
  {
    question: "Is my payment secure on Adzy.pro?",
    answer: "Yes, we use a secure escrow-style payment system. Your funds are held by us and only released to the seller once you have verified the publication of your backlink and are satisfied with the result."
  },
  {
    question: "Can I request custom content for my backlink placement?",
    answer: "Absolutely! You can either provide your own content or choose our 'Custom Content' option during the order process, where our expert SEO writers will create a high-quality article for you."
  },
  {
    question: "Do you offer refunds if the backlink is removed?",
    answer: "Yes, we offer a publication guarantee. If a backlink is removed within the agreed-upon period (typically life of the site), we will either get it restored or provide a full refund."
  }
];

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, i) => (
            <div key={i} className={`${styles.faqItem} ${activeIndex === i ? styles.active : ''}`}>
              <button 
                className={styles.question}
                onClick={() => toggleFAQ(i)}
              >
                <span>{faq.question}</span>
                <span className={styles.icon}>{activeIndex === i ? '−' : '+'}</span>
              </button>
              <div className={styles.answer}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
