require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.order.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.user.deleteMany({});

  // Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@adzy.pro',
      name: 'Adzy Admin',
      role: 'ADMIN',
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: 'seller@example.com',
      name: 'John Seller',
      role: 'SELLER',
    },
  });

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      name: 'Jane Buyer',
      role: 'BUYER',
    },
  });

  // Create Listings
  const listings = [
    { name: 'TechCrunch.com', niche: 'Technology', traffic: '15M+', dr: 92, price: 1200 },
    { name: 'Healthline.com', niche: 'Health', traffic: '200M+', dr: 93, price: 2500 },
    { name: 'SaaSWeekly.io', niche: 'SaaS', traffic: '50K+', dr: 45, price: 150 },
    { name: 'CryptoNews.net', niche: 'Crypto', traffic: '1.2M+', dr: 68, price: 450 },
  ];

  for (const l of listings) {
    await prisma.listing.create({
      data: {
        ...l,
        sellerId: seller.id,
        status: 'APPROVED',
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
