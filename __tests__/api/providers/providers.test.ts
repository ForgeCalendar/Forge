import { GET, POST } from "@/app/api/providers/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/ai-providers", () => ({
  isValidProviderType: jest.fn((type: string) =>
    ["anthropic", "openai", "google", "mistral", "openai-compatible"].includes(
      type
    )
  ),
  KNOWN_MODELS: {
    anthropic: [
      { modelId: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
      { modelId: "claude-haiku-4-20250414", name: "Claude Haiku 4" },
    ],
    openai: [{ modelId: "gpt-4o", name: "GPT-4o" }],
    google: [],
    mistral: [],
    "openai-compatible": [],
  },
}));

const mockProvider = {
  id: "provider-1",
  userId: "test@example.com",
  type: "anthropic",
  name: "My Anthropic",
  baseUrl: null,
  apiKey: "sk-ant-test-key-123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  models: [
    {
      id: "model-1",
      providerId: "provider-1",
      modelId: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
      isDefault: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ],
};

describe("GET /api/providers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all providers for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const mockProviders = [
      { ...mockProvider, id: "provider-1", type: "anthropic" },
      { ...mockProvider, id: "provider-2", type: "openai", name: "My OpenAI" },
    ];

    prismaMock.provider.findMany.mockResolvedValue(mockProviders as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("provider-1");
    expect(data[1].id).toBe("provider-2");
    expect(prismaMock.provider.findMany).toHaveBeenCalledWith({
      where: { userId: "test@example.com" },
      include: { models: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.provider.findMany.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("POST /api/providers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new provider with auto-populated models", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.create.mockResolvedValue({
      ...mockProvider,
      models: undefined,
    } as any);
    prismaMock.aIModel.createMany.mockResolvedValue({ count: 2 });
    prismaMock.provider.findUnique.mockResolvedValue(mockProvider as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "anthropic",
        name: "My Anthropic",
        apiKey: "sk-ant-test-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("provider-1");
    expect(data.type).toBe("anthropic");
    expect(prismaMock.provider.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        type: "anthropic",
        name: "My Anthropic",
        baseUrl: null,
        apiKey: "sk-ant-test-key-123",
      },
    });
    expect(prismaMock.aIModel.createMany).toHaveBeenCalled();
    expect(prismaMock.provider.findUnique).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      include: { models: true },
    });
  });

  it("should create a provider with baseUrl for openai-compatible", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const selfHosted = {
      ...mockProvider,
      id: "provider-2",
      type: "openai-compatible",
      name: "Local LLM",
      baseUrl: "http://localhost:1234/v1",
      models: [],
    };

    prismaMock.provider.create.mockResolvedValue({
      ...selfHosted,
      models: undefined,
    } as any);
    prismaMock.provider.findUnique.mockResolvedValue(selfHosted as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "openai-compatible",
        name: "Local LLM",
        apiKey: "not-needed",
        baseUrl: "http://localhost:1234/v1",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.baseUrl).toBe("http://localhost:1234/v1");
    expect(prismaMock.provider.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        type: "openai-compatible",
        name: "Local LLM",
        baseUrl: "http://localhost:1234/v1",
        apiKey: "not-needed",
      },
    });
    expect(prismaMock.aIModel.createMany).not.toHaveBeenCalled();
  });

  it("should return 400 when type is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        name: "My Provider",
        apiKey: "sk-test-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("type, name, and apiKey are required");
  });

  it("should return 400 when apiKey is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "anthropic",
        name: "My Anthropic",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("type, name, and apiKey are required");
  });

  it("should return 400 when name is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "anthropic",
        apiKey: "sk-ant-test-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("type, name, and apiKey are required");
  });

  it("should return 400 when provider type is invalid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "invalid-provider",
        name: "Bad Provider",
        apiKey: "sk-test-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid provider type");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "anthropic",
        name: "My Anthropic",
        apiKey: "sk-ant-test-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.provider.create.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "POST",
      body: {
        type: "anthropic",
        name: "My Anthropic",
        apiKey: "sk-ant-test-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
