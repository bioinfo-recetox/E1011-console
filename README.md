# Console for E1011

This is a modified version of the [WebVM](https://webvm.io) code to suite 
the needs of UNIX course E1011 at Masaryk University. Please refer to the
original source code for all the details and latest version: 
[WebVM on Github](https://github.com/leaningtech/webvm).

## Original License

WebVM is released under the Apache License, Version 2.0.

You are welcome to use, modify, and redistribute the contents of this repository.

The public CheerpX deployment is provided **as-is** and is **free to use** for technological exploration, testing and use by individuals. Any other use by organizations, including non-profit, academia and the public sector, requires a license. Downloading a CheerpX build for the purpose of hosting it elsewhere is not permitted without a commercial license.

Read more [here](https://cheerpx.io/docs/licensing) about our licensing practices.

If you want to build a product on top of CheerpX/WebVM, please see our other licensing options: [CheerpX licensing](https://cheerpx.io/licensing) or get in touch: sales@leaningtech.com

## Custom disk image

The root filesystem image used by the terminal (`custom-disk-images/e1011_image.ext2`)
is **not** stored in this git repository. It is a large (600MB+) binary, and this repo
is a public GitHub fork of [leaningtech/webvm](https://github.com/leaningtech/webvm) —
GitHub blocks pushing new Git LFS objects to public forks, so the image can't be
committed here even via LFS.

Instead, host the built `.ext2` image externally and point `config_public_terminal.js`
at it:

- **Local development**: keep the file at `custom-disk-images/e1011_image.ext2`
  (already `.gitignore`d) and leave the config as-is:
  ```js
  export const diskImageUrl = "/custom-disk-images/e1011_image.ext2";
  export const diskImageType = "bytes";
  ```
  `nginx.conf` serves that directory directly.

- **Deployed/production**: upload the `.ext2` file to external storage that serves
  static files over HTTPS **with HTTP Range request support** (required — CheerpX
  fetches the image lazily in chunks, not as one download). Then set:
  ```js
  export const diskImageUrl = "https://<your-storage-host>/e1011_image.ext2";
  export const diskImageType = "bytes";
  ```

  The image is published as a
  [GitHub Release asset](https://github.com/bioinfo-recetox/E1011-console/releases/tag/disk-image-v1)
  on this repo (release assets aren't subject to the LFS-on-fork restriction, and are
  served with Range support). **Note:** GitHub's release storage does not send CORS
  headers, so a browser `fetch`/`XHR` for the image fails with a CORS error from any
  origin other than the one serving the app itself (that's fine for local dev, where
  nginx serves both from `localhost`, but not for a deployed app on a different
  origin, e.g. Cloudflare Pages). For a cross-origin deployment, go through the CORS
  proxy Worker instead (see "Deploying to Cloudflare Pages" below):
  ```js
  export const diskImageUrl = "https://e1011-disk-image-proxy.e1011.workers.dev";
  export const diskImageType = "bytes";
  ```
  To publish a new version of the image, create a new release (e.g. `disk-image-v2`)
  with `gh release create disk-image-v2 custom-disk-images/e1011_image.ext2 --title "..."`
  and update `cf-disk-image-proxy/worker.js`'s `UPSTREAM` constant + redeploy the proxy.

See build instructions for the image itself at the
[CheerpX custom images guide](https://cheerpx.io/docs/guides/custom-images).

## Deploying to Cloudflare Pages

The app is deployed as a static site on Cloudflare Pages (free tier — the whole
build is ~12MB since CheerpX itself is fetched from Leaning Technologies' CDN at
runtime, not bundled here):

- **Live URL**: https://e1011-console.pages.dev
- **Cloudflare project**: `e1011-console` (account: popovici@bioxlab.org)

CheerpX requires cross-origin isolation, so the deployed site must send these
response headers on every request — done via the [`_headers`](_headers) file
(Cloudflare Pages' convention for per-path custom headers), copied into the build
output by `vite.config.js`'s `viteStaticCopy` config:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

### Disk image CORS proxy

The deployed app fetches the disk image from a different origin than the one
serving it, and GitHub's release storage sends no CORS headers (see above), so
[`cf-disk-image-proxy/`](cf-disk-image-proxy) is a small standalone Cloudflare
Worker that proxies the GitHub Release asset and adds the required
`Access-Control-Allow-Origin` (and Range passthrough) headers, without
duplicating the 640MB file into a second storage backend:
- **Live URL**: https://e1011-disk-image-proxy.e1011.workers.dev
- **Worker name**: `e1011-disk-image-proxy`

### Redeploying

```bash
# App (from the repo root) — builds with the CORS-proxy disk URL, deploys, then
# reverts config_public_terminal.js back to the local-dev default:
sed -i 's|^export const diskImageUrl = "/custom-disk-images/e1011_image.ext2";$|export const diskImageUrl = "https://e1011-disk-image-proxy.e1011.workers.dev";|' config_public_terminal.js
npm run build
npx wrangler pages deploy build --project-name=e1011-console --branch=main
git checkout -- config_public_terminal.js

# CORS proxy Worker (only needed if worker.js changes or the image release URL changes)
cd cf-disk-image-proxy && npx wrangler deploy
```
