import { GET, PUT, DELETE } from "@/app/api/goals/[id]/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockGoal } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

const mockParams = { params: Promise.resolve({ id: "goal-1" }) };

describe("GET /api/goals/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a specific goal", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.findFirst.mockResolvedValue(mockGoal as any);

    const request = createMockRequest({ method: "GET" });
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(mockGoal.id);
    expect(data.title).toBe(mockGoal.title);
    expect(data.description).toBe(mockGoal.description);
    expect(prismaMock.goal.findFirst).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: "test@example.com" },
      include: {
        events: { orderBy: { order: "asc" } },
        infoTags: true,
      },
    });
  });

  it("should return 404 when goal is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "GET" });
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Goal not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "GET" });
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });
});

describe("PUT /api/goals/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update a goal", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const updatedGoal = {
      ...mockGoal,
      title: "Updated Goal",
      description: "Updated Description",
    };

    prismaMock.goal.findFirst.mockResolvedValue(mockGoal as any);
    prismaMock.goal.update.mockResolvedValue(updatedGoal as any);

    const request = createMockRequest({
      method: "PUT",
      body: {
        title: "Updated Goal",
        description: "Updated Description",
        dueDate: "2024-12-31",
        events: [],
        infoTags: [],
      },
    });

    const response = await PUT(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Updated Goal");
    expect(prismaMock.goal.findFirst).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: "test@example.com" },
    });
  });

  it("should return 404 when goal is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      method: "PUT",
      body: {
        title: "Updated Goal",
      },
    });

    const response = await PUT(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Goal not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "PUT",
      body: { title: "Updated Goal" },
    });

    const response = await PUT(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });
});

describe("DELETE /api/goals/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a goal", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.findFirst.mockResolvedValue(mockGoal as any);
    prismaMock.goal.delete.mockResolvedValue(mockGoal as any);

    const request = createMockRequest({ method: "DELETE" });
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Goal deleted successfully");
    expect(prismaMock.goal.delete).toHaveBeenCalledWith({
      where: { id: "goal-1" },
    });
  });

  it("should return 404 when goal is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "DELETE" });
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Goal not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "DELETE" });
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.findFirst.mockResolvedValue(mockGoal as any);
    prismaMock.goal.delete.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "DELETE" });
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete goal");
  });
});
