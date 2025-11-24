import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { saveMap, type SaveMapPayload } from "./controllers/saveMap.js";

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .get("/", () => "lighting-vtt is running ⚔️")
  .post("/save", ({ body }) => saveMap(body as SaveMapPayload));

const resolvePort = () => {
  const envPort = Number(process.env.PORT);
  if (!Number.isNaN(envPort) && envPort > 0) {
    return envPort;
  }

  const flagIndex = process.argv.findIndex((arg) => arg === "--port" || arg === "-p");

  if (flagIndex !== -1) {
    const value = Number(process.argv[flagIndex + 1]);
    if (!Number.isNaN(value) && value > 0) {
      return value;
    }
  }

  return 3001;
};

if (import.meta.main) {
  const port = resolvePort();
  app.listen({ port });

  const hostname = app.server?.hostname ?? "localhost";
  const listeningPort = app.server?.port ?? port;

  console.log(`lighting-vtt API listening on http://${hostname}:${listeningPort}/api`);
}

export default app.handle;
