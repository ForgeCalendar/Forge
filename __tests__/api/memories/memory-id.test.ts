import { GET, PUT, DELETE } from "@/app/api/memories/[id]/route";
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

describe("GET /api/memories/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return memory for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(mockMemory as any);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.question).toBe(mockMemory.question);
    expect(prismaMock.memory.findFirst).toHaveBeenCalledWith({
      where: { id: "memory-1", userId: "test@example.com" },
    });
  });

  it("should return 404 when memory not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "non-existent" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Memory not found");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch memory");
  });
});

describe("PUT /api/memories/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update memory successfully", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(mockMemory as any);

    const updatedMemory = { ...mockMemory, answer: "January 15, 2025" };
    prismaMock.memory.update.mockResolvedValue(updatedMemory as any);

    const request = createMockRequest({
      method: "PUT",
      body: { answer: "January 15, 2025" },
    });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.answer).toBe("January 15, 2025");
    expect(prismaMock.memory.update).toHaveBeenCalledWith({
      where: { id: "memory-1" },
      data: { answer: "January 15, 2025" },
    });
  });

  it("should update both question and answer", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(mockMemory as any);

    const updatedMemory = {
      ...mockMemory,
      question: "New question?",
      answer: "New answer",
    };
    prismaMock.memory.update.mockResolvedValue(updatedMemory as any);

    const request = createMockRequest({
      method: "PUT",
      body: { question: "New question?", answer: "New answer" },
    });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await PUT(request, { params });

    expect(response.status).toBe(200);
    expect(prismaMock.memory.update).toHaveBeenCalledWith({
      where: { id: "memory-1" },
      data: { question: "New question?", answer: "New answer" },
    });
  });

  it("should return 404 when memory not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      method: "PUT",
      body: { answer: "Updated" },
    });
    const params = Promise.resolve({ id: "non-existent" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Memory not found");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "PUT",
      body: { answer: "Updated" },
    });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(mockMemory as any);
    prismaMock.memory.update.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "PUT",
      body: { answer: "Updated" },
    });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update memory");
  });
});

describe("DELETE /api/memories/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete memory successfully", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(mockMemory as any);
    prismaMock.memory.delete.mockResolvedValue(mockMemory as any);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Memory deleted successfully");
    expect(prismaMock.memory.delete).toHaveBeenCalledWith({
      where: { id: "memory-1" },
    });
  });

  it("should return 404 when memory not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "non-existent" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Memory not found");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.memory.findFirst.mockResolvedValue(mockMemory as any);
    prismaMock.memory.delete.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "memory-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete memory");
  });
});
