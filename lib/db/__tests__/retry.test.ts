import { describe, expect, it, vi } from "vitest";
import { DbTimeoutError, isTransientDbError, withDbRetry } from "@/lib/db/retry";

describe("isTransientDbError", () => {
  it("reconoce códigos de conexión transitorios", () => {
    expect(isTransientDbError({ code: "CONNECTION_CLOSED" })).toBe(true);
    expect(isTransientDbError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientDbError({ code: "CONNECT_TIMEOUT" })).toBe(true);
  });

  it("reconoce el código sepultado en el mensaje", () => {
    expect(
      isTransientDbError(new Error("write CONNECTION_CLOSED ...pooler:6543")),
    ).toBe(true);
    expect(isTransientDbError(new Error("terminating connection due to ..."))).toBe(
      true,
    );
  });

  it("NO reintenta errores deterministas de query", () => {
    // statement_timeout, violación de constraint, sintaxis…
    expect(isTransientDbError({ code: "57014" })).toBe(false);
    expect(isTransientDbError({ code: "23505" })).toBe(false);
    expect(isTransientDbError(new Error("duplicate key value"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
    expect(isTransientDbError("boom")).toBe(false);
  });
});

describe("withDbRetry", () => {
  it("devuelve el valor sin reintentar si fn tiene éxito", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withDbRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reintenta un error transitorio y acaba teniendo éxito", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: "CONNECTION_CLOSED" })
      .mockResolvedValue("ok");
    await expect(withDbRetry(fn, { baseDelayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("propaga al instante un error NO transitorio (sin reintentar)", async () => {
    const fn = vi.fn().mockRejectedValue({ code: "23505" });
    await expect(withDbRetry(fn, { baseDelayMs: 0 })).rejects.toEqual({
      code: "23505",
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("se rinde tras agotar los reintentos y lanza el último error", async () => {
    const err = { code: "ECONNRESET" };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withDbRetry(fn, { retries: 2, baseDelayMs: 0 }),
    ).rejects.toEqual(err);
    expect(fn).toHaveBeenCalledTimes(3); // 1 inicial + 2 reintentos
  });

  it("lanza DbTimeoutError si fn cuelga más que timeoutMs", async () => {
    const fn = vi.fn(() => new Promise(() => {})); // nunca resuelve (cuelga)
    await expect(
      withDbRetry(fn, { timeoutMs: 20, baseDelayMs: 0 }),
    ).rejects.toBeInstanceOf(DbTimeoutError);
  });

  it("NO reintenta tras un timeout (evita añadir presión al pool)", async () => {
    const fn = vi.fn(() => new Promise(() => {}));
    await expect(
      withDbRetry(fn, { timeoutMs: 20, retries: 3, baseDelayMs: 0 }),
    ).rejects.toBeInstanceOf(DbTimeoutError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
