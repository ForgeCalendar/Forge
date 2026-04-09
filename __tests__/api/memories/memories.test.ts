import { GET, POST } from "@/app/api/memories/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

const mockMemory = {
  id: "memory-1",
  userId: "test@example.com",
  question: "What is the project deadline?",
  answer: "December 31, 2024",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("GET /api/memories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all memories for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findMany.mockResolvedValue([mockMemory] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].question).toBe(mockMemory.question);
    expect(prismaMock.memory.findMany).toHaveBeenCalledWith({
      where: { userId: "test@example.com" },
      orderBy: { updatedAt: "desc" },
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
    prismaMock.memory.findMany.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch memories");
  });
});

describe("POST /api/memories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a memory successfully", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.create.mockResolvedValue(mockMemory as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        question: "What is the project deadline?",
        answer: "December 31, 2024",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.question).toBe(mockMemory.question);
    expect(prismaMock.memory.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        question: "What is the project deadline?",
        answer: "December 31, 2024",
      },
    });
  });

  it("should return 400 when question is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: { answer: "Some answer" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("question and answer are required");
  });

  it("should return 400 when answer is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: { question: "Some question" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("question and answer are required");
  });

  it("should return 400 when question is empty string", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: { question: "  ", answer: "Some answer" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("question and answer are required");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "POST",
      body: { question: "Q", answer: "A" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.create.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "POST",
      body: { question: "Q", answer: "A" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create memory");
  });
});
