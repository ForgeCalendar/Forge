import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.event.deleteMany();
  await prisma.infoTag.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.aIModel.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  const testUserEmail = "test@example.com";
  const testUserPassword = "password123";
  const passwordHash = await bcrypt.hash(testUserPassword, 10);

  const user = await prisma.user.create({
    data: {
      id: testUserEmail,
      passwordHash,
    },
  });

  console.log(`Created test user: ${testUserEmail} / ${testUserPassword}`);

  const providerConfigs = [
    {
      type: "anthropic",
      envKey: "ANTHROPIC_API_KEY",
      name: "Anthropic",
      models: [
        {
          modelId: "claude-sonnet-4-5-20250929",
          name: "Claude Sonnet 4.5",
          isDefault: true,
        },
        {
          modelId: "claude-haiku-4-20250414",
          name: "Claude Haiku 4",
          isDefault: false,
        },
      ],
    },
    {
      type: "openai",
      envKey: "OPENAI_API_KEY",
      name: "OpenAI",
      models: [
        { modelId: "gpt-4o", name: "GPT-4o", isDefault: true },
        { modelId: "gpt-4o-mini", name: "GPT-4o Mini", isDefault: false },
      ],
    },
    {
      type: "google",
      envKey: "GOOGLE_API_KEY",
      name: "Google AI",
      models: [
        {
          modelId: "gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          isDefault: true,
        },
      ],
    },
    {
      type: "mistral",
      envKey: "MISTRAL_API_KEY",
      name: "Mistral",
      models: [
        {
          modelId: "mistral-large-latest",
          name: "Mistral Large",
          isDefault: true,
        },
      ],
    },
  ];

  for (const config of providerConfigs) {
    const apiKey = process.env[config.envKey];
    if (apiKey) {
      const provider = await prisma.provider.create({
        data: {
          userId: user.id,
          type: config.type,
          name: config.name,
          apiKey,
        },
      });
      await prisma.aIModel.createMany({
        data: config.models.map((m) => ({
          providerId: provider.id,
          modelId: m.modelId,
          name: m.name,
          isDefault: m.isDefault,
        })),
      });
      console.log(`Added ${config.type} provider for test user`);
    }
  }

  console.log("Database seeded successfully!");
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
