import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { LightPreset } from "../shared/index";

export const scenesTable = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  name: text("name").notNull(),
  mapUrl: text("map_url").notNull(),
  lightsState: text("lights_state", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  mirrorsState: text("mirrors_state", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  presets: text("presets", { mode: "json" }).$type<LightPreset[]>().notNull().default([]),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
