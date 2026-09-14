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

See build instructions for the image itself at the
[CheerpX custom images guide](https://cheerpx.io/docs/guides/custom-images).
