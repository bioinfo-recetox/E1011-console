# Session notes — 2026-09-14

Context/history from a working session on getting the custom disk image working
locally and deploying the console to Cloudflare Pages. Kept here for whoever
picks this up next (possibly future-you). The *current* state of things is
documented properly in [README.md](../README.md) — this file is the "how we
got here, and what's still open" narrative that doesn't belong in end-user
docs.

## Timeline / what happened

1. **Custom disk image wasn't taking effect.** Editing `config_public_terminal.js`
   had no effect because this repo is built as a static SvelteKit site
   (`npm run build` → `build/`) served by nginx from that pre-built output —
   not a live dev server. Vite inlines the config's constants into the JS
   bundle *at build time*. Fix: just remember to `npm run build` after any
   config change before it'll show up.

2. **Image booted to the intro banner and hung.** Root cause:
   [src/lib/WebVM.svelte](../src/lib/WebVM.svelte) unconditionally mounted a
   "sample documents" device at the hardcoded path `/home/user/documents`
   (upstream WebVM's default user), but our image uses `/home/student`.
   `/home/user` didn't exist in the image at all, the mount threw, and — since
   that particular exception wasn't caught anywhere that prints to the
   terminal — it just silently hung with the real error only visible in
   DevTools console. Fixed by deriving the mount path from `configObj.opts.cwd`
   instead of hardcoding it (commit `5e420f2`).

3. **Couldn't `git push` the 640MB `.ext2` image, even via LFS.** GitHub
   blocks pushing *new* LFS objects to any public fork, for anyone, regardless
   of permissions — and `bioinfo-recetox/E1011-console` is a fork of
   `leaningtech/webvm`. Not a permissions bug, a hard platform restriction.
   Dropped LFS tracking entirely (commit `a8adfec`) and instead published the
   image as a **GitHub Release asset** (`disk-image-v1` tag) — release assets
   aren't subject to that restriction.

4. **Deployed the app itself to Cloudflare Pages**, since GitHub Pages can't
   set custom response headers and CheerpX requires cross-origin isolation
   (`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` /
   `Cross-Origin-Resource-Policy`). Added `_headers` (Cloudflare Pages'
   header-config convention) wired into the build via `vite.config.js`.

5. **`wrangler pages project create` auto-delegated to Cloudflare's newer
   "Workers with static assets" model** on first run, and tried rewriting
   `svelte.config.js` (swapping `adapter-static` → `adapter-cloudflare`),
   `package.json`, `package-lock.json`, and creating a Workers-style
   `wrangler.jsonc` — then failed partway through on a missing
   `static/.assetsignore` file, leaving those rewrites in the working tree.
   **Had to `git checkout` them all back and `npm install` to resync
   `node_modules`.** Re-ran with `--force` to get classic/direct Pages
   instead. ⚠️ **Gotcha for next time**: if this project's Pages setup ever
   needs recreating, expect the same auto-delegation attempt on a *fresh*
   `wrangler pages project create` — pass `--force` from the start, or better,
   just `wrangler pages deploy` directly if the project already exists (no
   `project create` needed then).

6. **The deployed app couldn't fetch the disk image: CORS, not a config
   issue.** GitHub's release/blob storage sends no `Access-Control-Allow-Origin`
   header. Confirmed with `curl -H Range` that Range requests work fine
   (curl doesn't enforce CORS), but a real browser blocked the cross-origin
   `fetch`/`XHR` outright. Fixed with a small standalone Cloudflare Worker
   ([cf-disk-image-proxy/](../cf-disk-image-proxy)) that proxies the GitHub
   release asset and adds CORS + Range passthrough headers — avoids
   duplicating the 640MB file into a second storage backend (R2 was
   considered but isn't enabled on this Cloudflare account yet — needs
   enabling via the dashboard first, which sometimes wants billing details on
   file even for the free tier).

7. Verified the whole thing end-to-end in an actual browser (not just curl):
   loads → boots → reaches `student@:~$` prompt, fetching the image
   cross-origin through the proxy.

## Accounts / auth state (as of this session)

- **GitHub**: authenticated via `gh` (installed to `~/.local/bin/gh`, not on
  PATH by default — use the full path or add it) as `vladpopovici`, scopes
  include `repo`. Token stored in the OS keyring.
- **Cloudflare**: authenticated via `wrangler` (fetched on demand with
  `npx wrangler`) as `popovici@bioxlab.org`, account id
  `81b797ebc47d60639adaae76cc5f5aff`. Credentials in
  `~/.config/.wrangler/config/default.toml`. Token scopes include
  `pages (write)` and `workers_scripts (write)` but **not R2** (not enabled
  on the account).
- **`workers.dev` subdomain**: registered as `e1011` (one-time account-level
  setting, done via the Cloudflare dashboard — there's no CLI command for it).

## Open items / things worth doing next

- **Local browser-side cache staleness risk**: `src/routes/+page.svelte`
  passes a hardcoded `cacheId="blocks_terminal"` to CheerpX's `IDBDevice`
  (the browser's local IndexedDB cache of disk blocks), unrelated to the
  image's actual identity/version. CheerpX's docs don't say whether it
  detects a changed backing image and invalidates that cache automatically.
  Practical risk: a student who used the console once, then the instructor
  swaps the disk image, might keep getting stale cached blocks. Cheap
  mitigation: bump `cacheId` (e.g. `"blocks_terminal_v2"`) whenever the
  image content changes meaningfully — not yet automated/wired to anything.
  **Discussed but not implemented as of this note.**
- Consider enabling R2 on the Cloudflare account (dashboard) at some point —
  would let the image be stored directly in Cloudflare with configurable CORS
  and zero egress, removing the GitHub-Release-plus-proxy-Worker indirection.
  Not urgent; current setup works.
- No CI/auto-deploy is set up. Both the Pages app and the proxy Worker are
  deployed manually via the `wrangler` commands in README.md's "Redeploying"
  section. Could wire up Cloudflare's Git integration (dashboard) for
  auto-deploy-on-push if that's wanted later.
