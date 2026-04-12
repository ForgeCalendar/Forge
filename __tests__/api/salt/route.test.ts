import { GET } from "@/app/api/salt/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";

describe("GET /api/salt", () => {
  const mockSalt = {
    id: "salt-id",
    userId: "test@example.com",
    salt: "mockSaltValue123==",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return salt for valid username", async () => {
    prismaMock.userSalt.findUnique.mockResolvedValue(mockSalt);

    const request = new Request(
      "http://localhost:3000/api/salt?username=test@example.com"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salt).toBe("mockSaltValue123==");
    expect(prismaMock.userSalt.findUnique).toHaveBeenCalledWith({
      where: {
        userId: "test@example.com",
      },
    });
  });

  it("should return 400 when username is missing", async () => {
    const request = new Request("http://localhost:3000/api/salt");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username is required");
  });

  it("should return 404 when salt not found", async () => {
    prismaMock.userSalt.findUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/salt?username=nonexistent@example.com"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Salt not found");
  });

  it("should handle different usernames", async () => {
    const salt1 = { ...mockSalt, userId: "user1@example.com", salt: "salt1==" };
    const salt2 = { ...mockSalt, userId: "user2@example.com", salt: "salt2==" };

    prismaMock.userSalt.findUnique
      .mockResolvedValueOnce(salt1)
      .mockResolvedValueOnce(salt2);

    const request1 = new Request(
      "http://localhost:3000/api/salt?username=user1@example.com"
    );
    const response1 = await GET(request1);
    const data1 = await response1.json();

    const request2 = new Request(
      "http://localhost:3000/api/salt?username=user2@example.com"
    );
    const response2 = await GET(request2);
    const data2 = await response2.json();

    expect(data1.salt).toBe("salt1==");
    expect(data2.salt).toBe("salt2==");
  });

  it("should return 500 when database error occurs", async () => {
    prismaMock.userSalt.findUnique.mockRejectedValue(
      new Error("Database error")
    );

    const request = new Request(
      "http://localhost:3000/api/salt?username=test@example.com"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch salt");
  });
});
