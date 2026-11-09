# dbdbking.com

Static copy of Francis Lam’s personal website, captured from Cargo on 9 November 2026. Includes the homepage, 18 projects, About, Contact, 29 category pages, and their local images, styles, and gallery code.

## Hosting

This repository is ready for GitHub Pages: publish from the `codex/github-pages` branch, `/ (root)`. `.nojekyll` serves the static files directly. The active address is https://dbdbking.github.io/dbdbking.com/. No custom domain is configured while previewing under github.io. Before changing GoDaddy DNS, restore `dbdbking.com` in the repository’s Pages settings and add a `CNAME` file containing that domain.

The website entry point is `index.html`. Original Cargo project, About, Contact, and category URLs have directory redirects to the corresponding `.html` pages, preserving existing bookmarks. Images, galleries, and navigation use local resources. Vimeo posters are stored locally; clicking a poster loads the original Vimeo player and requires internet.

## Updating

Edit the relevant HTML pages and files in `assets/`, commit, and push to `codex/github-pages`. GitHub Pages publishes the changes. Keep `.nojekyll`. Add `CNAME` only when restoring the custom domain.

Preview locally with `python3 -m http.server 8000`, then open <http://localhost:8000/>. No build step or package installation is required.

This repository contains the public website runtime only. The original source capture, download manifest, and maintenance scripts remain in the separate `dbdbking-local` backup; they are not required for hosting. Rebuilding that backup produces `dist/`; hosting adaptations such as the clean-URL redirects, `404.html` and `.nojekyll` must be retained when refreshing these files.
