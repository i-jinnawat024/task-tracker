// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteResets: vi.fn(),
  deleteSessions: vi.fn(),
  transaction: vi.fn(),
  createSession: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {
  passwordReset: { findUnique: mocks.findUnique },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/auth/session", () => ({ createSession: mocks.createSession }));
vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword,
  hashToken: (token: string) => `hash:${token}`,
  newSessionToken: vi.fn(),
}));

import { applyPasswordReset } from "@/lib/auth/reset-service";

const input = { password: "new-password-123", confirm: "new-password-123" };

describe("applyPasswordReset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findUnique.mockResolvedValue({
      userId: "user-1", usedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    mocks.hashPassword.mockResolvedValue("new-hash");
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { update: mocks.update },
      passwordReset: { updateMany: mocks.updateMany, deleteMany: mocks.deleteResets },
      session: { deleteMany: mocks.deleteSessions },
    }));
  });

  it("claims a valid token, revokes other links and sessions, then signs in", async () => {
    expect(await applyPasswordReset("token", input)).toEqual({ ok: true });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: "hash:token", usedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { usedAt: expect.any(Date) },
    });
    expect(mocks.deleteResets).toHaveBeenCalledWith({ where: { userId: "user-1", usedAt: null } });
    expect(mocks.deleteSessions).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
  });

  it("aborts the transaction when another request consumed the token after the initial read", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect(await applyPasswordReset("token", input)).toMatchObject({ ok: false });
    // Throwing from the callback is essential: Prisma must roll back the password update.
    await expect(mocks.transaction.mock.results[0].value).rejects.toThrow();
    expect(mocks.deleteSessions).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("checks expiry again after password hashing", async () => {
    vi.useFakeTimers();
    const later = new Date(Date.now() + 120_000);
    mocks.hashPassword.mockImplementation(async () => {
      vi.setSystemTime(later);
      return "new-hash";
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    try {
      expect(await applyPasswordReset("token", input)).toMatchObject({ ok: false });
      expect(mocks.updateMany.mock.calls[0][0].where.expiresAt.gt).toEqual(later);
      expect(mocks.createSession).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not start a transaction for an already used token", async () => {
    mocks.findUnique.mockResolvedValue({ userId: "user-1", usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) });
    expect(await applyPasswordReset("token", input)).toMatchObject({ ok: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not sign in when the database transaction fails", async () => {
    mocks.deleteSessions.mockRejectedValue(new Error("database unavailable"));
    await expect(applyPasswordReset("token", input)).rejects.toThrow("database unavailable");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
