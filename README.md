# cshieldsce.github.io

My project portfolio, built with Astro and deployed to GitHub Pages.

## Run it

```bash
npm install
npm run sync      # pull the series articles from the project repos
npm run dev
```

`npm run verify` runs the content lint, the tests, a build and a link check. It is what CI runs.

## Add a project

1. Put the images under `src/assets/projects/<slug>/`.
2. Add `src/content/projects/<slug>.mdx` with the frontmatter from `src/content.config.ts`.
3. Every project needs a status: finished, in-progress, designed, simulated or hardened. The status note says what has not happened yet.

Series projects (`kind: series`) get an article list. Their articles are either hand-written in `src/content/articles/<slug>/` or pulled from a public repo by `scripts/sync-series.mjs`, as listed in `sync.config.json`.

## Content rules

`scripts/check-content.mjs` fails the build on private details, school framing, em and en dashes in my own prose, and wording that claims something physical happened. A page that has to use that wording goes in `scripts/claims-allowlist.json` once I have checked it is true.


The private terms themselves are not in the repo. Put them as a JSON array of regex strings in `scripts/banned.local.json` (git-ignored) or in the `BANNED_TERMS` environment variable, and the lint checks for them too.
