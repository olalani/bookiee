import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { phoneNumber: '+2348012345678' },
    update: {},
    create: {
      phoneNumber: '+2348012345678',
      fullName: 'Adaeze Okonkwo',
      passwordHash,
    },
  });

  const business = await prisma.business.create({
    data: {
      name: 'Adaeze Rice & Foodstuff',
      businessType: 'sme',
      onboarded: true,
      categories: {
        create: [
          { name: 'Sales', isSystemDefault: true },
          { name: 'Expenses', isSystemDefault: true },
          { name: 'Salary', isSystemDefault: true },
          { name: 'Utilities', isSystemDefault: true },
          { name: 'Transport', isSystemDefault: true },
          { name: 'Food & Drinks', isSystemDefault: true },
          { name: 'Rent', isSystemDefault: true },
          { name: 'Miscellaneous', isSystemDefault: true },
        ],
      },
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: business.id,
      userId: user.id,
      role: 'owner',
    },
  });

  const categories = await prisma.category.findMany({
    where: { businessId: business.id },
  });

  const salesCat = categories.find((c) => c.name === 'Sales');
  const expensesCat = categories.find((c) => c.name === 'Expenses');
  const transportCat = categories.find((c) => c.name === 'Transport');

  const now = new Date();
  const transactions = [
    {
      sourceType: 'voice',
      direction: 'in',
      amount: 150000,
      counterpartyName: 'Chioma Nwosu',
      categoryId: salesCat?.id,
      confidenceScore: 0.92,
      transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
    },
    {
      sourceType: 'voice',
      direction: 'out',
      amount: 45000,
      counterpartyName: 'NEPA',
      categoryId: expensesCat?.id,
      confidenceScore: 0.88,
      transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
    },
    {
      sourceType: 'manual',
      direction: 'in',
      amount: 80000,
      counterpartyName: 'Emeka Supplies',
      categoryId: salesCat?.id,
      transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
    },
    {
      sourceType: 'voice',
      direction: 'out',
      amount: 12000,
      counterpartyName: 'Uber',
      categoryId: transportCat?.id,
      confidenceScore: 0.95,
      transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    },
    {
      sourceType: 'invoice',
      direction: 'in',
      amount: 200000,
      counterpartyName: 'Tunde Designs',
      categoryId: salesCat?.id,
      transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    },
  ];

  for (const txn of transactions) {
    await prisma.transaction.create({
      data: {
        businessId: business.id,
        createdBy: user.id,
        status: 'confirmed',
        ...txn,
      },
    });
  }

  await prisma.staff.createMany({
    data: [
      { businessId: business.id, fullName: 'Ibrahim Musa', salaryAmount: 80000, pensionRate: 8 },
      { businessId: business.id, fullName: 'Funke Adeyemi', salaryAmount: 65000, pensionRate: 8 },
    ],
  });

  await prisma.product.createMany({
    data: [
      { businessId: business.id, name: 'Bag of Rice (50kg)', price: 65000, stockQty: 20 },
      { businessId: business.id, name: 'Bag of Beans (50kg)', price: 85000, stockQty: 10 },
      { businessId: business.id, name: 'Groundnut Oil (5L)', price: 18000, stockQty: 30 },
      { businessId: business.id, name: 'Garri (10kg)', price: 5000, stockQty: 50 },
    ],
  });

  console.log('Seed complete!');
  console.log(`User: +2348012345678 / password123`);
  console.log(`Business: ${business.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
