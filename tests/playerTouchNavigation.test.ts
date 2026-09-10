import { describe, expect, test } from "bun:test";
import { Container, type FederatedPointerEvent } from "pixi.js";
import { attachPlayerTouchNavigation } from "../src/components/templates/GameCanvas/playerTouchNavigation";

function setup(enabled = () => true) {
  const stage = new Container();
  const map = new Container();
  const cleanup = attachPlayerTouchNavigation(stage, () => map, (scale) => Math.min(3, Math.max(0.1, scale)), enabled);
  const pointer = (type: string, id: number, x: number, y: number, pointerType = "touch") => {
    stage.emit(type, { pointerId: id, global: { x, y }, pointerType } as FederatedPointerEvent);
  };
  return { map, pointer, cleanup };
}

describe("player map touch navigation", () => {
  test("pans with one finger and stops after cancellation", () => {
    const { map, pointer } = setup();
    pointer("pointerdown", 1, 20, 30);
    pointer("globalpointermove", 1, 60, 80);
    expect([map.x, map.y]).toEqual([40, 50]);
    pointer("pointercancel", 1, 60, 80);
    pointer("globalpointermove", 1, 100, 100);
    expect([map.x, map.y]).toEqual([40, 50]);
  });

  test("pinches around the moving midpoint, then resumes pan without jumping", () => {
    const { map, pointer } = setup();
    pointer("pointerdown", 1, 100, 100);
    pointer("pointerdown", 2, 200, 100);
    pointer("globalpointermove", 2, 300, 100);
    expect(map.scale.x).toBe(2);
    expect([map.x, map.y]).toEqual([-100, -100]);
    expect((200 - map.x) / map.scale.x).toBe(150);
    pointer("pointerup", 2, 300, 100);
    pointer("globalpointermove", 1, 110, 120);
    expect([map.x, map.y]).toEqual([-90, -80]);
  });

  test("clamps pinch zoom and tolerates coincident fingers", () => {
    const { map, pointer } = setup();
    pointer("pointerdown", 1, 100, 100);
    pointer("pointerdown", 2, 100, 100);
    pointer("globalpointermove", 2, 200, 100);
    expect(Number.isFinite(map.x)).toBe(true);
    pointer("globalpointermove", 2, 1000, 100);
    expect(map.scale.x).toBe(3);
    pointer("globalpointermove", 2, 101, 100);
    expect(map.scale.x).toBe(0.1);
  });

  test("leaves DM and mouse input alone and removes listeners on cleanup", () => {
    let enabled = false;
    const { map, pointer, cleanup } = setup(() => enabled);
    pointer("pointerdown", 1, 0, 0);
    pointer("globalpointermove", 1, 50, 50);
    expect(map.x).toBe(0);
    enabled = true;
    pointer("pointerdown", 1, 0, 0, "mouse");
    pointer("globalpointermove", 1, 50, 50, "mouse");
    expect(map.x).toBe(0);
    pointer("pointerdown", 1, 0, 0);
    cleanup();
    pointer("globalpointermove", 1, 50, 50);
    expect(map.x).toBe(0);
  });

  test("does not move the map for a pointer owned by a token", () => {
    const { map, pointer } = setup();
    // Token pointerdown stops propagation before reaching the stage.
    pointer("globalpointermove", 1, 100, 100);
    expect([map.x, map.y, map.scale.x]).toEqual([0, 0, 1]);
  });
});
