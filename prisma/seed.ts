import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categoryData = [
  {
    name: "Programming & Tech",
    slug: "programming-tech",
    icon: "💻",
    description: "You think it. A programmer develops it.",
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
      }
    ]
  }
];

async function main() {
  console.log('Cleaning database...');
  await prisma.category.deleteMany();

  console.log('Seeding categories...');
  
  for (const cat of categoryData) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
      }
    });

    if (cat.children) {
      for (const sub of cat.children) {
        const subParent = await prisma.category.create({
          data: {
            name: sub.name,
            slug: sub.slug,
            parentId: parent.id,
          }
        });

        if (sub.children) {
          for (const leaf of sub.children) {
            await prisma.category.create({
              data: {
                name: leaf.name,
                slug: leaf.slug,
                parentId: subParent.id,
              }
            });
          }
        }
      }
    }
  }

  // Create an admin user
  await prisma.user.upsert({
    where: { email: 'admin@adzy.pro' },
    update: {},
    create: {
      email: 'admin@adzy.pro',
      name: 'Adzy Admin',
      role: 'ADMIN',
    }
  });

  console.log('Seed completed! Created admin@adzy.pro');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
