import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // CI
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Seed uchun ${name} kerak`);
  return v;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: required('DATABASE_URL') }),
});

const ORG_NAME = 'Atoyo';
const phone = required('SEED_OWNER_PHONE');
const password = required('SEED_OWNER_PASSWORD');
const name = process.env.SEED_OWNER_NAME ?? 'Owner';

const org =
  (await prisma.organization.findFirst({ where: { name: ORG_NAME } })) ??
  (await prisma.organization.create({ data: { name: ORG_NAME } }));

const existing = await prisma.user.findUnique({
  where: { organizationId_phone: { organizationId: org.id, phone } },
});
if (!existing) {
  await prisma.user.create({
    data: {
      organizationId: org.id,
      name,
      phone,
      role: 'OWNER',
      passwordHash: await argon2.hash(password),
    },
  });
  console.log(`Seed: ${ORG_NAME} + OWNER yaratildi`);
} else {
  console.log(`Seed: ${ORG_NAME} OWNER allaqachon bor`);
}
await prisma.$disconnect();
