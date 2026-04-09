import { GET, POST } from "@/app/api/chat-history/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

const mockChatHistory = {
  id: "chat-1",
  userId: "test@example.com",
  title: "Test Chat",
  role: "Assistant",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("GET /api/chat-history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all chat histories for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.chatHistory.findMany.mockResolvedValue([mockChatHistory] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe(mockChatHistory.title);
    expect(prismaMock.chatHistory.findMany).toHaveBeenCalledWith({
      where: { userId: "test@example.com" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("should return 401 when not authenticated", async () => {
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
    prismaMock.chatHistory.findMany.mockRejectedValue(
      new Error("Database error")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch chat histories");
  });
});

describe("POST /api/chat-history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a chat history with custom title", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.chatHistory.create.mockResolvedValue(mockChatHistory as any);

    const request = createMockRequest({
      method: "POST",
      body: { title: "Test Chat", role: "Assistant" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe(mockChatHistory.title);
    expect(prismaMock.chatHistory.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        title: "Test Chat",
        role: "Assistant",
      },
      select: {
        id: true,
        title: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("should create a chat history with default title when not provided", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.chatHistory.create.mockResolvedValue(mockChatHistory as any);

    const request = createMockRequest({
      method: "POST",
      body: {},
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prismaMock.chatHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "test@example.com",
          role: "Assistant",
        }),
      })
    );
  });

  it("should create a chat history with custom role", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    const customRoleChat = { ...mockChatHistory, role: "GoalPlanner" };
    prismaMock.chatHistory.create.mockResolvedValue(customRoleChat as any);

    const request = createMockRequest({
      method: "POST",
      body: { role: "GoalPlanner" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.role).toBe("GoalPlanner");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "POST",
      body: { title: "Test" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.chatHistory.create.mockRejectedValue(
      new Error("Database error")
    );

    const request = createMockRequest({
      method: "POST",
      body: { title: "Test" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create chat history");
  });
});
