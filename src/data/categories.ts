export interface CategoryNode {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  banner?: string;
  children?: CategoryNode[];
}

export const categoryData: CategoryNode[] = [
  {
    name: "Programming & Tech",
    slug: "programming-tech",
    icon: "💻",
    description: "You think it. A programmer develops it.",
    banner: "https://fiverr-res.cloudinary.com/image/upload/f_auto,q_auto,dpr_2.0/v1/attachments/generic_asset/asset/4ef56911ca639ed678b4081ef77f33d7-1718002626577/Programming%20%26%20Tech.png",
    children: [
      {
        name: "Website Development",
        slug: "website-development",
        children: [
          { name: "WordPress Development", slug: "wordpress-development" },
          { name: "Shopify Development", slug: "shopify-development" },
          { name: "Custom Website Development", slug: "custom-website" },
          { name: "Website Maintenance", slug: "website-maintenance" }
        ]
      },
      {
        name: "Software Development",
        slug: "software-development",
        children: [
          { name: "Web Applications", slug: "web-apps" },
          { name: "Desktop Applications", slug: "desktop-apps" },
          { name: "AI Development", slug: "ai-development" },
          { name: "APIs & Integrations", slug: "apis-integrations" }
        ]
      },
      {
        name: "Mobile Apps",
        slug: "mobile-apps",
        children: [
          { name: "iOS App Development", slug: "ios-dev" },
          { name: "Android App Development", slug: "android-dev" },
          { name: "Cross-platform Apps", slug: "cross-platform" }
        ]
      }
    ]
  },
  {
    name: "Graphics & Design",
    slug: "graphics-design",
    icon: "🎨",
    description: "Build your brand. One pixel at a time.",
    children: [
      {
        name: "Logo & Brand Identity",
        slug: "logo-brand",
        children: [
          { name: "Logo Design", slug: "logo-design" },
          { name: "Brand Style Guides", slug: "brand-guides" },
          { name: "Business Cards", slug: "business-cards" }
        ]
      },
      {
        name: "Web & App Design",
        slug: "web-app-design",
        children: [
          { name: "UX Design", slug: "ux-design" },
          { name: "UI Design", slug: "ui-design" },
          { name: "App Design", slug: "app-design" }
        ]
      }
    ]
  },
  {
    name: "Digital Marketing",
    slug: "digital-marketing",
    icon: "📈",
    children: [
      {
        name: "Search",
        slug: "search",
        children: [
          { name: "SEO Optimization", slug: "seo" },
          { name: "Local SEO", slug: "local-seo" },
          { name: "SEM", slug: "sem" }
        ]
      }
    ]
  }
];
