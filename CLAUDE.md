@AGENTS.md

## Claude Code

- Project skills are in `agent/skills/`. Run `npm run link-skills` once so they appear as
  `/validate-setup`, `/brand`, `/copy`, `/leads`, `/pricing-test`, `/legal`, `/launch` and `/results`.
- Start a new site with `/validate-setup`: it interviews the owner and fills `site.config.ts`,
  the homepage copy and `PROJECT.md`.
- `npm run dev:api` is long-running: start it in the background, not in the foreground.
- After edits, run `npm run build && npm run validate` and `npx astro check`; report what they say.
