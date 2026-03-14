import { GET, PUT, DELETE } from "@/app/api/providers/[id]/route";
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

describe("GET /api/providers/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a specific provider with models", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("provider-1");
    expect(data.type).toBe("anthropic");
    expect(data.models).toHaveLength(1);
    expect(prismaMock.provider.findFirst).toHaveBeenCalledWith({
      where: { id: "provider-1", userId: "test@example.com" },
      include: { models: true },
    });
  });

  it("should return 404 when provider is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Provider not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.provider.findFirst.mockRejectedValue(
      new Error("Database error")
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("PUT /api/providers/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update a provider", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);
    prismaMock.provider.update.mockResolvedValue({
      ...mockProvider,
      name: "Updated Name",
      apiKey: "sk-ant-new-key",
    } as any);

    const request = createMockRequest({
      method: "PUT",
      body: {
        name: "Updated Name",
        apiKey: "sk-ant-new-key",
      },
    });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Updated Name");
    expect(prismaMock.provider.update).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      data: {
        name: "Updated Name",
        apiKey: "sk-ant-new-key",
      },
      include: { models: true },
    });
  });

  it("should update provider type if valid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);
    prismaMock.provider.update.mockResolvedValue({
      ...mockProvider,
      type: "openai",
    } as any);

    const request = createMockRequest({
      method: "PUT",
      body: { type: "openai" },
    });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("openai");
  });

  it("should return 400 when provider type is invalid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);

    const request = createMockRequest({
      method: "PUT",
      body: { type: "invalid-provider" },
    });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid provider type");
  });

  it("should return 404 when provider is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Name" },
    });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Provider not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Name" },
    });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);
    prismaMock.provider.update.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Name" },
    });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("DELETE /api/providers/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a provider", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);
    prismaMock.provider.delete.mockResolvedValue(mockProvider as any);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Provider deleted successfully");
    expect(prismaMock.provider.delete).toHaveBeenCalledWith({
      where: { id: "provider-1" },
    });
  });

  it("should return 404 when provider is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.provider.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Provider not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.provider.findFirst.mockResolvedValue(mockProvider as any);
    prismaMock.provider.delete.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "provider-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
