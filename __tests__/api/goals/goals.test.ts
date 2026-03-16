import { GET, POST } from "@/app/api/goals/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockGoal } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/goals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all goals for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const mockGoals = [
      { ...mockGoal, id: "goal-1" },
      { ...mockGoal, id: "goal-2" },
    ];

    prismaMock.goal.findMany.mockResolvedValue(mockGoals as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("goal-1");
    expect(data[1].id).toBe("goal-2");
    expect(prismaMock.goal.findMany).toHaveBeenCalledWith({
      where: { userId: "test@example.com" },
      include: {
        events: {
          orderBy: { order: "asc" },
        },
        infoTags: true,
      },
      orderBy: {
        createdAt: "desc",
      },
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
    prismaMock.goal.findMany.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch goals");
  });
});

describe("POST /api/goals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new goal with events and infoTags", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const mockCreatedGoal = {
      ...mockGoal,
      events: [
        {
          id: "event-1",
          title: "Task 1",
          completed: false,
          minutesEstimate: 60,
          order: 0,
        },
      ],
      infoTags: [
        {
          id: "tag-1",
          title: "Priority",
          info: "High",
        },
      ],
    };

    prismaMock.goal.create.mockResolvedValue(mockCreatedGoal as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Test Goal",
        description: "Test Description",
        dueDate: "2024-12-31",
        events: [
          {
            title: "Task 1",
            completed: false,
            minutesEstimate: 60,
          },
        ],
        infoTags: [
          {
            title: "Priority",
            info: "High",
          },
        ],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe(mockCreatedGoal.id);
    expect(data.title).toBe(mockCreatedGoal.title);
    expect(data.events).toHaveLength(1);
    expect(data.infoTags).toHaveLength(1);
    expect(prismaMock.goal.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        title: "Test Goal",
        description: "Test Description",
        dueDate: "2024-12-31",
        events: {
          create: [
            {
              title: "Task 1",
              completed: false,
              minutesEstimate: 60,
              order: 0,
            },
          ],
        },
        infoTags: {
          create: [
            {
              title: "Priority",
              info: "High",
            },
          ],
        },
      },
      include: {
        events: {
          orderBy: { order: "asc" },
        },
        infoTags: true,
      },
    });
  });

  it("should create goal without events and infoTags", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.goal.create.mockResolvedValue(mockGoal as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Simple Goal",
        description: "Simple Description",
        dueDate: "2024-12-31",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(prismaMock.goal.create).toHaveBeenCalled();
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Test Goal",
        description: "Test Description",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.goal.create.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Test Goal",
        description: "Test Description",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create goal");
  });
});
