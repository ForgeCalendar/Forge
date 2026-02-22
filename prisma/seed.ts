import { PrismaClient, AIProvider } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.event.deleteMany();
  await prisma.infoTag.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.aIAgentApiKey.deleteMany();
  await prisma.user.deleteMany();

  // Create a test user
  const testUserEmail = "test@example.com";
  const testUserPassword = "password123"; // In production, use a secure password
  const passwordHash = await bcrypt.hash(testUserPassword, 10);

  const user = await prisma.user.create({
    data: {
      id: testUserEmail,
      passwordHash,
    },
  });

  console.log(`Created test user: ${testUserEmail} / ${testUserPassword}`);

  // Create AI Agent API keys from environment variables if available
  const apiKeyProviders = [
    {
      provider: AIProvider.ANTHROPIC,
      envKey: "ANTHROPIC_API_KEY",
      name: "Claude API Key",
    },
    {
      provider: AIProvider.OPENAI,
      envKey: "OPENAI_API_KEY",
      name: "OpenAI API Key",
    },
    {
      provider: AIProvider.GOOGLE,
      envKey: "GOOGLE_API_KEY",
      name: "Google AI API Key",
    },
    {
      provider: AIProvider.MISTRAL,
      envKey: "MISTRAL_API_KEY",
      name: "Mistral API Key",
    },
    {
      provider: AIProvider.COHERE,
      envKey: "COHERE_API_KEY",
      name: "Cohere API Key",
    },
  ];

  for (const { provider, envKey, name } of apiKeyProviders) {
    const apiKey = process.env[envKey];
    if (apiKey) {
      await prisma.aIAgentApiKey.create({
        data: {
          userId: user.id,
          provider,
          apiKey,
          name,
        },
      });
      console.log(`Added ${provider} API key for test user`);
    }
  }

  // Create sample goals for the test user
  const goal1 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Finish pre-commit setup",
      description:
        "Finalize and install the repository pre-commit hooks; run autoupdate and fix any reported issues.",
      dueDate: "2026-01-15T17:00:00",
      events: {
        create: [
          {
            userId: user.id,
            title: "Add .pre-commit-config.yaml",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            completed: true,
            minutesEstimate: 30,
            order: 0,
          },
          {
            userId: user.id,
            title: "Run pre-commit install",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            completed: false,
            minutesEstimate: 15,
            order: 1,
          },
          {
            userId: user.id,
            title: "Run pre-commit autoupdate",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
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
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            completed: true,
            minutesEstimate: 10,
            order: 0,
          },
          {
            userId: user.id,
            title: "Adjust hero section spacing",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
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
      dueDate: "2026-02-01T09:30:00",
      events: {
        create: [
          {
            userId: user.id,
            title: "Test login flow",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            completed: false,
            minutesEstimate: 40,
            order: 0,
          },
          {
            userId: user.id,
            title: "Test token refresh",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
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
      ).toISOString(),
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        9,
        30
      ).toISOString(),
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
      ).toISOString(),
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        15,
        0
      ).toISOString(),
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
      ).toISOString(),
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        11,
        30
      ).toISOString(),
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
