import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { saveMap } from "./controllers/saveMap";

export const config = {
  runtime: "edge",
};

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .get("/", () => "lighting-vtt is running ⚔️")
  .post("/save", saveMap);

export default app.handle;
