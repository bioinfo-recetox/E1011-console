// The root OS image location, change to local filepath if serving locally
// original:
// export const diskImageUrl = "wss://disks.webvm.io/debian_buster_large_permis_fixed_01-06-2026.ext2";
// deployed (Cloudflare Pages / any other origin - goes through the CORS proxy
// in front of the GitHub Release asset, since GitHub sends no CORS headers
// and this would otherwise fail cross-origin - see README.md):
// export const diskImageUrl = "https://e1011-disk-image-proxy.e1011.workers.dev";
export const diskImageUrl = "/custom-disk-images/e1011_image.ext2";
// The root filesystem backend type use "cloud" for serving remotely or "bytes" for serving locally
// original:
// export const diskImageType = "cloud";
export const diskImageType = "bytes";
// Print an introduction message about the technology
export const printIntro = true;
// Is a graphical display needed
export const needsDisplay = false;
// Executable full path (Required)
export const cmd = "/bin/bash";
// Arguments, as an array (Required)
export const args = ["--login"];
// Optional extra parameters
export const opts = {
	// Environment variables
	env: ["HOME=/home/student", "TERM=xterm", "USER=student", "SHELL=/bin/bash", "EDITOR=nano", "LANG=en_US.UTF-8", "LC_ALL=C"],
	// Current working directory
	cwd: "/home/student",
	// User id
	uid: 1000,
	// Group id
	gid: 1000
};
