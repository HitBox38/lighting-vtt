# Effects library seed

`effects-library.zip` is the optional committed fallback for Vercel preview
effect seeding. Generate it from a production Convex export with:

```bash
CONVEX_DEPLOY_KEY=<production deploy key> \
  bunx --bun convex export --prod --include-file-storage \
  --path /tmp/effects-library.full.zip
bun scripts/seed-preview-effects.mjs --slim \
  /tmp/effects-library.full.zip convex/seed/effects-library.zip
```

Do not commit exports that contain scenes, player sessions, reports, or
thumbnail work queues.
