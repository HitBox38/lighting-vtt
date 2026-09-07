import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(rateLimiter);
app.use(workpool, { name: "thumbnailWorkpool" });

export default app;
