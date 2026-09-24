# Repository Guidelines

## Project Structure & Module Organization

This repository hosts a static course catalogue. `dist/index.html` contains the page and sign-up form; `dist/admin.html` lists browser-local sign-ups and exports CSV; `dist/courses.json` holds course records. `.github/workflows/pages.yml` deploys `dist/` to GitHub Pages. `market-brief.md` captures positioning and conversion notes, and `.agents/commands/` contains the publishing procedure. There is no separate test or asset directory.

## Build, Test, and Development Commands

No package manager, compilation step, or build script is required. Serve the site over HTTP from the project root:

```sh
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`. This allows the page to fetch `courses.json`; opening the HTML directly as a file may block that request. GitHub Actions publishes the same `dist/` directory when changes reach `main` and supports manual deployment from the Actions page.

## Coding Style & Naming Conventions

Keep the site dependency-free and compatible with ordinary static hosting. Use semantic HTML, responsive CSS, and browser-native JavaScript. Preserve the existing compact, single-file implementation in `dist/index.html` unless a change clearly benefits from extracting files. Keep course data in valid JSON in `dist/courses.json`; use the existing field names and course-code pattern. Use descriptive, lowercase hyphenated names for new files. No formatter or linter is configured.

## Testing Guidelines

There is no automated test framework or coverage threshold. For interface changes, serve the page locally and check all courses, filters, details, and narrow-screen layout. For sign-up changes, check validation, consent, a saved reference, and same-browser CSV export. Validate JSON syntax before publishing course records.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subject lines, such as “Make the academy easier to understand and publish safely.” Follow that style and explain the reason for the change. Pull requests should summarize the user-facing change, list relevant verification, link related issues when applicable, and include screenshots for visual updates. Confirm the Pages workflow succeeds after merging to `main`.

## Security & Configuration

Do not commit `.env` files, credentials, private keys, sign-up exports, or generated ZIP bundles. Keep local secrets out of tracked files and review staged changes before publishing. `.gitignore` excludes environment files and generated ZIPs.
