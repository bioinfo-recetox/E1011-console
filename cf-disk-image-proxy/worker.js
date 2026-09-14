// Minimal CORS-adding proxy in front of the E1011 disk image, hosted as a
// GitHub Release asset. GitHub release/blob storage doesn't send
// Access-Control-Allow-Origin, so a cross-origin browser fetch (e.g. from
// the Cloudflare Pages-hosted console) is blocked by CORS even though the
// underlying storage supports HTTP Range requests fine. This Worker just
// forwards the request (Range header included) and adds CORS headers to
// the response, without duplicating the 640MB file into new storage.

const UPSTREAM =
	"https://github.com/bioinfo-recetox/E1011-console/releases/download/disk-image-v1/e1011_image.ext2";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
	"Access-Control-Allow-Headers": "Range",
	"Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag",
	"Access-Control-Max-Age": "86400",
};

export default {
	async fetch(request) {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (request.method !== "GET" && request.method !== "HEAD") {
			return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
		}

		const upstreamHeaders = new Headers();
		const range = request.headers.get("Range");
		if (range) upstreamHeaders.set("Range", range);

		const upstreamResponse = await fetch(UPSTREAM, {
			method: request.method,
			headers: upstreamHeaders,
			redirect: "follow",
		});

		const headers = new Headers(upstreamResponse.headers);
		for (const [key, value] of Object.entries(CORS_HEADERS)) {
			headers.set(key, value);
		}

		return new Response(upstreamResponse.body, {
			status: upstreamResponse.status,
			statusText: upstreamResponse.statusText,
			headers,
		});
	},
};
