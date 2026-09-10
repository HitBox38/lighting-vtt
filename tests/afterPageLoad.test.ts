import { describe, expect, mock, test } from "bun:test";
import { afterPageLoad } from "../src/lib/afterPageLoad";

function browserState(readyState = "loading", supportsIdle = true) {
  const events = new EventTarget();
  const timers = new Map<number, () => void>();
  const idle = new Map<number, () => void>();
  let nextId = 0;
  const browser = {
    document: { readyState },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    setTimeout: (callback: () => void) => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: (id: number) => timers.delete(id),
    requestIdleCallback: supportsIdle ? (callback: () => void) => { idle.set(++nextId, callback); return nextId; } : undefined,
    cancelIdleCallback: (id: number) => idle.delete(id),
  } as unknown as Window;
  const flush = (queue: Map<number, () => void>) => {
    const callbacks = [...queue.values()];
    queue.clear();
    callbacks.forEach((callback) => callback());
  };
  return { browser, load: () => events.dispatchEvent(new Event("load")), timers, idle, flush };
}

describe("optional work after page load", () => {
  test("waits for load, a rendering delay, and idle before starting", () => {
    const env = browserState();
    const callback = mock();
    afterPageLoad(callback, env.browser);
    expect(env.timers.size).toBe(0);
    env.load();
    env.load();
    expect(env.timers.size).toBe(1);
    env.flush(env.timers);
    expect(callback).not.toHaveBeenCalled();
    env.flush(env.idle);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("works when mounted after load and without requestIdleCallback", () => {
    const env = browserState("complete", false);
    const callback = mock();
    afterPageLoad(callback, env.browser);
    env.flush(env.timers);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test.each(["load", "timer", "idle"])("cleanup cancels at the %s stage, including StrictMode remounts", (stage) => {
    const env = browserState();
    const callback = mock();
    const cancel = afterPageLoad(callback, env.browser);
    if (stage !== "load") env.load();
    if (stage === "idle") env.flush(env.timers);
    cancel();
    env.load();
    env.flush(env.timers);
    env.flush(env.idle);
    expect(callback).not.toHaveBeenCalled();
    afterPageLoad(callback, env.browser);
    env.load();
    env.flush(env.timers);
    env.flush(env.idle);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
