# Cook & Bake Academy Singapore

[![Live site](https://img.shields.io/badge/GitHub%20Pages-live-2f6b4f?logo=github)](https://ukesston.github.io/Cook-Bake-Demo/)
![HTML5](https://img.shields.io/badge/HTML5-static-orange?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-responsive-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=222)
![GitHub Actions](https://img.shields.io/badge/deploy-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)

A polished catalogue site for Cook & Bake Academy Singapore, featuring hands-on cooking and baking classes, course details, and two campus locations. Course sign-ups stay in the visitor's browser; no backend or payment processing is configured.

**Live site:** [ukesston.github.io/Cook-Bake-Demo](https://ukesston.github.io/Cook-Bake-Demo/)

## Overview

The site presents the proposed 20-course catalogue with search and category filters. Each course card shows its fee, course length, campus, and next listed intake. A details dialog provides learning outcomes, class timing, upcoming dates, what to bring, and allergen information. A shared sign-up dialog stores entries in browser `localStorage`; `admin.html` lists and exports entries stored in that same browser. Course data is kept separately from the page so catalogue updates do not require rewriting the interface.

## Technology

- HTML5 for semantic page structure
- CSS for responsive layout and visual styling
- Browser-native JavaScript for filtering and course details
- Browser `localStorage` for device-local sign-ups
- JSON for the course catalogue
- GitHub Actions and GitHub Pages for automated static hosting

## Run locally

No package installation or build step is required. Clone the repository and serve the `dist` folder over HTTP so the browser can fetch `courses.json`:

```sh
git clone https://github.com/uKesston/Cook-Bake-Demo.git
cd Cook-Bake-Demo
python -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). Python 3 is needed for this example; any static HTTP server can serve the same folder.

## Architecture

```text
GitHub repository
├── .github/workflows/pages.yml   Deploys dist/ on pushes to main
├── .openai/hosting.json          Sites source metadata
├── dist/
│   ├── index.html                Page, styles, interactions, and course rendering
│   ├── admin.html                Local sign-up list and CSV export
│   └── courses.json              Catalogue records fetched by the page
├── .agents/commands/
│   └── publish-to-github.md      Reusable publishing procedure
└── market-brief.md               Website positioning and conversion notes
```

The browser loads `dist/index.html`, fetches `dist/courses.json` relative to that page, and renders the catalogue client-side. The Pages workflow checks out `main`, packages `dist/`, then publishes it to GitHub Pages. It runs on pushes to `main` and can also be started manually from Actions.

Sign-ups are available only in the browser and device where they were submitted. `dist/admin.html` reads the same-origin `cb_signups` storage key and exports the columns in the signup CSV format. This static site does not collect entries centrally.

## Publishing

Push a reviewed commit to `main`, or run **Deploy to GitHub Pages** manually from the Actions tab. Check the latest [workflow runs](https://github.com/uKesston/Cook-Bake-Demo/actions/workflows/pages.yml) for deployment status.

## Security

Generated ZIP bundles and `.env` files are excluded by `.gitignore`. Keep credentials out of the repository and verify the files being staged before publishing. The public repository contains the static site source and catalogue.
