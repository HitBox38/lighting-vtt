import { expect, mock, test } from "bun:test";
import { createLazyClerkUiConstructor } from "../src/lib/lazyClerkUi";
import type { ui } from "@clerk/ui";

type Constructor = NonNullable<typeof ui.ClerkUI>;

test("auth construction does not load UI; concurrent mounts share one UI instance", async () => {
  const ensureMounted = mock(async () => ({}));
  const construct = mock();
  class FakeUi {
    static version = "test";
    version = "test";
    constructor(...args: unknown[]) { construct(...args); }
    ensureMounted = ensureMounted;
  }
  const load = mock(async () => FakeUi as unknown as Constructor);
  const LazyUi = createLazyClerkUiConstructor(load, "test");
  const args = [() => ({}), () => null, {}, {}] as unknown as ConstructorParameters<Constructor>;
  const instance = new LazyUi(...args);
  expect(load).not.toHaveBeenCalled();
  await Promise.all([instance.ensureMounted({ preloadHint: "signIn" }), instance.ensureMounted()]);
  expect(load).toHaveBeenCalledTimes(1);
  expect(construct).toHaveBeenCalledTimes(1);
  expect(construct).toHaveBeenCalledWith(...args);
  expect(ensureMounted).toHaveBeenCalledWith({ preloadHint: "signIn" });
  expect(LazyUi.version).toBe("test");
});

test("a failed UI download can be retried", async () => {
  const load = mock<() => Promise<Constructor>>().mockRejectedValueOnce(new Error("offline"));
  const LazyUi = createLazyClerkUiConstructor(load, "test");
  const instance = new LazyUi(...[() => ({}), () => null, {}, {}] as unknown as ConstructorParameters<Constructor>);
  await expect(instance.ensureMounted()).rejects.toThrow("offline");
  load.mockRejectedValueOnce(new Error("retry"));
  await expect(instance.ensureMounted()).rejects.toThrow("retry");
  expect(load).toHaveBeenCalledTimes(2);
});
