import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.event.deleteMany();
  await prisma.infoTag.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.aIModel.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.userSalt.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleared successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
