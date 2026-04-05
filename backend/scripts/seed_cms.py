"""
Seed CMS static pages + sitemap entries.
Run: python backend/scripts/seed_cms.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import AsyncSessionLocal
from app.models.models import StaticPage, SitemapEntry
from sqlalchemy import select
from datetime import datetime, timezone

STATIC_PAGES = [
    {
        "title": "About Us",
        "slug": "about",
        "content": """<h1>About Adzy</h1>
<p>Adzy is a premium backlink marketplace connecting publishers and advertisers worldwide.
Our platform helps content creators monetize their websites and businesses acquire high-quality links.</p>
<h2>Our Mission</h2>
<p>To build the most trusted link-building marketplace on the internet — where quality, transparency, and performance come first.</p>
<h2>Why Adzy?</h2>
<ul>
  <li>10,000+ verified publisher websites</li>
  <li>AI-powered domain quality scoring</li>
  <li>Escrow-protected transactions</li>
  <li>Dedicated account management</li>
</ul>""",
        "seo_title": "About Adzy — The World's Leading Backlink Marketplace",
        "seo_description": "Learn about Adzy's mission to connect publishers and advertisers through a trusted, AI-powered link marketplace.",
        "meta_keywords": "about adzy, backlink marketplace, link building platform",
        "is_published": True,
    },
    {
        "title": "Terms of Service",
        "slug": "terms",
        "content": """<h1>Terms of Service</h1>
<p><strong>Last updated: April 2, 2026</strong></p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using Adzy, you accept and agree to be bound by the terms and conditions in this agreement.</p>
<h2>2. Platform Use</h2>
<p>Adzy provides a marketplace connecting buyers and sellers of digital advertising and backlink services. Users must comply with all applicable laws and our community guidelines.</p>
<h2>3. Payments and Escrow</h2>
<p>All payments are processed through our secure escrow system. Funds are held until the buyer confirms delivery. Platform commission of 10% applies to all completed orders.</p>
<h2>4. Prohibited Activities</h2>
<ul>
  <li>Creating fake reviews or engagement</li>
  <li>Using the platform for illegal activities</li>
  <li>Circumventing our payment system</li>
  <li>Spamming or harassment of other users</li>
</ul>
<h2>5. Termination</h2>
<p>We reserve the right to suspend or terminate accounts that violate these terms without prior notice.</p>
<h2>Contact</h2>
<p>For questions, email <a href="mailto:legal@adzy.pro">legal@adzy.pro</a></p>""",
        "seo_title": "Terms of Service — Adzy",
        "seo_description": "Read Adzy's terms of service governing your use of our backlink marketplace platform.",
        "meta_keywords": "adzy terms of service, terms and conditions",
        "is_published": True,
    },
    {
        "title": "Privacy Policy",
        "slug": "privacy",
        "content": """<h1>Privacy Policy</h1>
<p><strong>Last updated: April 2, 2026</strong></p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us — name, email, payment details, and usage data to operate and improve our platform.</p>
<h2>2. How We Use Your Information</h2>
<ul>
  <li>Process transactions and orders</li>
  <li>Send notifications and updates</li>
  <li>Detect fraud and ensure platform security</li>
  <li>Improve our AI recommendation engine</li>
</ul>
<h2>3. Data Sharing</h2>
<p>We do not sell your personal information. We share data only with payment processors and service providers necessary to operate the platform.</p>
<h2>4. Data Retention</h2>
<p>We retain your data for as long as your account is active or as required by law.</p>
<h2>5. Your Rights</h2>
<p>You may request access, correction, or deletion of your data by emailing <a href="mailto:privacy@adzy.pro">privacy@adzy.pro</a></p>""",
        "seo_title": "Privacy Policy — Adzy",
        "seo_description": "Understand how Adzy collects, uses, and protects your personal information.",
        "meta_keywords": "adzy privacy policy, data protection",
        "is_published": True,
    },
    {
        "title": "FAQ",
        "slug": "faq",
        "content": """<h1>Frequently Asked Questions</h1>
<h2>For Buyers</h2>
<h3>How does the ordering process work?</h3>
<p>Browse gigs, select a package, and pay through our secure escrow. The seller delivers, you review, and funds are released.</p>
<h3>What if I'm not satisfied?</h3>
<p>You can request revisions or, if the seller doesn't deliver, open a dispute and our team will mediate.</p>
<h3>What payment methods are accepted?</h3>
<p>We accept all major credit cards, debit cards, and UPI via Razorpay.</p>
<h2>For Sellers</h2>
<h3>How do I get paid?</h3>
<p>Earnings accumulate in your Adzy wallet after order completion. Request a withdrawal to your PayPal or bank account — processed within 1-3 business days.</p>
<h3>What is the platform commission?</h3>
<p>Adzy charges 10% of each completed order. You keep 90% of the order value.</p>
<h3>How do I become a verified seller?</h3>
<p>Complete KYC verification in your seller dashboard. This unlocks higher order limits and priority placement.</p>""",
        "seo_title": "FAQ — Common Questions About Adzy",
        "seo_description": "Find answers to frequently asked questions about buying and selling on the Adzy marketplace.",
        "meta_keywords": "adzy faq, how does adzy work, marketplace questions",
        "is_published": True,
    },
    {
        "title": "Contact Us",
        "slug": "contact",
        "content": """<h1>Contact Us</h1>
<p>We'd love to hear from you. Reach the Adzy team through any of the channels below.</p>
<h2>Support</h2>
<p>For order issues, account problems, or general questions:<br>
<a href="mailto:support@adzy.pro">support@adzy.pro</a></p>
<h2>Business & Partnerships</h2>
<p>For enterprise orders, white-label solutions, or partnership opportunities:<br>
<a href="mailto:business@adzy.pro">business@adzy.pro</a></p>
<h2>Legal & Compliance</h2>
<p><a href="mailto:legal@adzy.pro">legal@adzy.pro</a></p>
<h2>Response Times</h2>
<ul>
  <li>Support: Within 24 hours</li>
  <li>Disputes: Within 48 hours</li>
  <li>Business inquiries: Within 3 business days</li>
</ul>""",
        "seo_title": "Contact Adzy — Support & Business Inquiries",
        "seo_description": "Get in touch with the Adzy team for support, partnerships, or any questions about our marketplace.",
        "meta_keywords": "contact adzy, adzy support, marketplace help",
        "is_published": True,
    },
]

SITEMAP_ENTRIES = [
    {"url": "https://adzy.pro",          "changefreq": "daily",   "priority": 1.0},
    {"url": "https://adzy.pro/marketplace", "changefreq": "daily",  "priority": 0.9},
    {"url": "https://adzy.pro/login",    "changefreq": "monthly", "priority": 0.5},
    {"url": "https://adzy.pro/signup",   "changefreq": "monthly", "priority": 0.5},
    {"url": "https://adzy.pro/pages/about",   "changefreq": "monthly", "priority": 0.6},
    {"url": "https://adzy.pro/pages/faq",     "changefreq": "monthly", "priority": 0.6},
    {"url": "https://adzy.pro/pages/contact", "changefreq": "monthly", "priority": 0.5},
    {"url": "https://adzy.pro/pages/terms",   "changefreq": "yearly",  "priority": 0.3},
    {"url": "https://adzy.pro/pages/privacy", "changefreq": "yearly",  "priority": 0.3},
]


async def seed():
    async with AsyncSessionLocal() as db:
        pages_added = 0
        for p in STATIC_PAGES:
            exists = await db.execute(select(StaticPage).where(StaticPage.slug == p["slug"]))
            if not exists.scalar_one_or_none():
                db.add(StaticPage(
                    **p,
                    published_at=datetime.now(timezone.utc) if p["is_published"] else None
                ))
                pages_added += 1
                print(f"  ✓ Page: {p['slug']}")
            else:
                print(f"  — Page already exists: {p['slug']}")

        sitemap_added = 0
        for e in SITEMAP_ENTRIES:
            exists = await db.execute(select(SitemapEntry).where(SitemapEntry.url == e["url"]))
            if not exists.scalar_one_or_none():
                db.add(SitemapEntry(**e))
                sitemap_added += 1
                print(f"  ✓ Sitemap: {e['url']}")
            else:
                print(f"  — Sitemap entry already exists: {e['url']}")

        await db.commit()
        print(f"\n✅ CMS seed complete — {pages_added} pages, {sitemap_added} sitemap entries added")


if __name__ == "__main__":
    asyncio.run(seed())
