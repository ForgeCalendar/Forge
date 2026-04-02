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

  // Create sample goals for the test user
  const goal1 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Finish pre-commit setup",
      description:
        "Finalize and install the repository pre-commit hooks; run autoupdate and fix any reported issues.",
      dueDate: new Date("2026-01-15T17:00:00Z"),
      events: {
        create: [
          {
            userId: user.id,
            title: "Add .pre-commit-config.yaml",
            start: new Date(),
            end: new Date(),
            completed: true,
            minutesEstimate: 30,
            order: 0,
          },
          {
            userId: user.id,
            title: "Run pre-commit install",
            start: new Date(),
            end: new Date(),
            completed: false,
            minutesEstimate: 15,
            order: 1,
          },
          {
            userId: user.id,
            title: "Run pre-commit autoupdate",
            start: new Date(),
            end: new Date(),
            completed: false,
            minutesEstimate: 20,
            order: 2,
          },
        ],
      },
      infoTags: {
        create: [
          { title: "Owner", info: "Patrick Li" },
          { title: "Repo", info: "forge (repo setup)" },
        ],
      },
    },
  });

  const goal2 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Polish frontend layout",
      description:
        "Adjust responsive styles and finalize the main landing section in the React app.",
      dueDate: null,
      events: {
        create: [
          {
            userId: user.id,
            title: "Fix mobile header spacing",
            start: new Date(),
            end: new Date(),
            completed: true,
            minutesEstimate: 10,
            order: 0,
          },
          {
            userId: user.id,
            title: "Adjust hero section spacing",
            start: new Date(),
            end: new Date(),
            completed: false,
            minutesEstimate: 25,
            order: 1,
          },
        ],
      },
      infoTags: {
        create: [
          { title: "Priority", info: "Medium" },
          { title: "Area", info: "UI/UX" },
        ],
      },
    },
  });

  const goal3 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Add unit tests for auth",
      description:
        "Write unit tests covering login/logout and token refresh logic.",
      dueDate: new Date("2026-02-01T09:30:00Z"),
      events: {
        create: [
          {
            userId: user.id,
            title: "Test login flow",
            start: new Date(),
            end: new Date(),
            completed: false,
            minutesEstimate: 40,
            order: 0,
          },
          {
            userId: user.id,
            title: "Test token refresh",
            start: new Date(),
            end: new Date(),
            completed: false,
            minutesEstimate: 35,
            order: 1,
          },
        ],
      },
      infoTags: {
        create: [
          { title: "Priority", info: "High" },
          { title: "Owner", info: "Backend team" },
        ],
      },
    },
  });

  // Create sample calendar events
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.event.create({
    data: {
      userId: user.id,
      title: "Morning standup",
      start: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        9,
        0
      ),
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        9,
        30
      ),
      kind: "break",
    },
  });

  await prisma.event.create({
    data: {
      userId: user.id,
      title: "Code review session",
      start: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        14,
        0
      ),
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        15,
        0
      ),
      kind: "task",
    },
  });

  await prisma.event.create({
    data: {
      userId: user.id,
      title: "Team planning",
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        10,
        0
      ),
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        11,
        30
      ),
      kind: "task",
    },
  });

  console.log("Database seeded successfully!");
  console.log(`Created goals: ${goal1.id}, ${goal2.id}, ${goal3.id}`);
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
