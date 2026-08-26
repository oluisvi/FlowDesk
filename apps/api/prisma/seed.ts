import { PrismaClient } from "@prisma/client";
import { argon2id, hash } from "argon2";

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!email || !password) return;
  const passwordHash = await hash(password, { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  await prisma.user.upsert({
    where: { email },
    create: { email, name: process.env.SEED_OWNER_NAME?.trim() || "FlowDesk Owner", passwordHash },
    update: { passwordHash },
  });
}

seed().finally(() => prisma.$disconnect());
