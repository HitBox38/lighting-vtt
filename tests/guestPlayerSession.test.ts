import { afterEach, expect, test } from "bun:test";
import { createGuestPlayerToken, readGuestPlayerToken, saveGuestPlayerToken } from "../src/lib/playerSession";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "sessionStorage");
});

function mockStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  return values;
}

test("guest credentials are random, scoped to scene and player, and read from persistent tab storage", () => {
  const values = mockStorage();
  const token = createGuestPlayerToken();
  expect(token).toMatch(/^[0-9a-f]{64}$/);
  expect(createGuestPlayerToken()).not.toBe(token);
  saveGuestPlayerToken("scene-a", "player-a", token);
  expect(readGuestPlayerToken("scene-a", "player-a")).toBe(token);
  expect(readGuestPlayerToken("scene-b", "player-a")).toBeUndefined();
  expect(readGuestPlayerToken("scene-a", "player-b")).toBeUndefined();
  const key = [...values.keys()][0];
  values.set(key, "b".repeat(64));
  expect(readGuestPlayerToken("scene-a", "player-a")).toBe("b".repeat(64));
  values.set(key, "malformed");
  expect(readGuestPlayerToken("scene-a", "player-a")).toBeUndefined();
  values.clear();
  expect(readGuestPlayerToken("scene-a", "player-a")).toBeUndefined();
});

test("disabled session storage stops guest enrollment and offers a rejoin path", () => {
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get: () => { throw new Error("blocked"); },
  });
  expect(createGuestPlayerToken).toThrow("rejoin using the invite link");
  expect(() => saveGuestPlayerToken("s", "p", "a".repeat(64))).toThrow("rejoin using the invite link");
  expect(readGuestPlayerToken("s", "p")).toBeUndefined();
});
