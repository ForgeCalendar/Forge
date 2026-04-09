import { POST } from "@/app/api/auth/logout/route";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  clearAuthCookie: jest.fn(),
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should logout successfully", async () => {
    (auth.clearAuthCookie as jest.Mock).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Logout successful");
    expect(auth.clearAuthCookie).toHaveBeenCalled();
  });

  it("should return 500 when logout fails", async () => {
    (auth.clearAuthCookie as jest.Mock).mockRejectedValue(
      new Error("Cookie error")
    );

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to logout");
  });
});
