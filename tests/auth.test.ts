// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  createSession: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { create: mocks.create, findUnique: mocks.findUnique } },
}));
vi.mock("@/lib/auth/session", () => ({ createSession: mocks.createSession }));
vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

import { loginUser, registerUser } from "@/lib/auth";

describe("registerUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.hashPassword.mockResolvedValue("hash");
    mocks.create.mockResolvedValue({ id: "user-1" });
  });

  it("creates the account pending approval and does not start a session", async () => {
    const result = await registerUser({
      email: "a@b.com",
      password: "password123",
      displayName: "A",
    });

    expect(result).toMatchObject({ ok: true });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.verifyPassword.mockResolvedValue(true);
  });

  it("refuses to sign in an unapproved account even with the correct password", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      isApproved: false,
    });

    const result = await loginUser({ email: "a@b.com", password: "password123" });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("signs in an approved account with the correct password", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      isApproved: true,
    });

    const result = await loginUser({ email: "a@b.com", password: "password123" });

    expect(result).toEqual({ ok: true });
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
  });
});
