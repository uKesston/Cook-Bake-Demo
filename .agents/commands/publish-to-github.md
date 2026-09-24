# Publish to GitHub

Use this project-level publishing procedure when asked to publish this site to GitHub Pages. Work from the repository root.

## 1. Review and prepare

- Inspect `git status`, the current branch, remotes, and the existing GitHub Pages workflow before changing anything.
- Keep the existing repository and deployment setup. Do not rewrite history or force-push.
- Update `README.md` when project structure, setup, architecture, or the live URL changes. Keep the overview, technology badges, installation steps, architecture, and deployment notes accurate.
- Confirm `.github/workflows/pages.yml` publishes the static `dist/` folder to GitHub Pages on `main` and via manual dispatch. Repair it if missing or broken.
- Add the public Pages URL to the repository About website field and keep the description/topics accurate. Use GitHub's repository settings or a supported GitHub connector; verify the saved values.

## 2. Scan before staging or pushing

- Inspect every changed and untracked file that could enter the commit, and inspect the tracked repository for sensitive material.
- Check filenames for `.env` files, private keys, credential dumps, signup exports, and generated archives. Check contents for private-key blocks, access tokens, API keys, passwords, and other credentials. Use a secret scanner such as Gitleaks when already available; otherwise run a careful content and filename scan without printing any secret values.
- Review `.gitignore` and Git's staged-file list. Do not stage `.env`, credentials, signup exports, local backups, generated bundles, or unrelated files.
- If a plausible secret or personal-data export is found, stop before committing or pushing. Identify the affected filename without reproducing any secret, then remove or replace it and rescan. If a credential was already committed, treat it as exposed and tell the user to revoke it.
- Before committing, report the exact files to be added and confirm whether the scan found any secret or sensitive export. Never claim a clean scan unless the checks completed.

## 3. Commit and publish

- Stage only the reviewed files, inspect the staged diff, and commit with a message that explains why the change matters.
- Push to `origin main` only when the changes are reviewed and the security scan is clear. Do not use force-push.
- Wait for the Pages workflow triggered by the push to finish. Inspect its result and open the deployed URL to confirm the site responds.
- Report the commit, exact changed files, scan scope/result, Actions run URL, and live Pages URL. If deployment fails, report the failing run and its useful error instead of claiming success.
