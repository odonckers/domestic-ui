#!/usr/bin/env node
/*
 * Tiny zero-dependency static server for local preview and tests.
 *   node scripts/serve.mjs [port]   (default 4173, or $PORT)
 * Serves the repository root. Read-only, GET/HEAD only, no directory listing.
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
};

createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method Not Allowed");

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "Bad Request");
  }

  let file = normalize(join(root, pathname));
  if (file !== root.replace(/[/\\]$/, "") && !file.startsWith(root)) return send(res, 403, "Forbidden");

  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { location: `${pathname}/` });
        return res.end();
      }
      file = join(file, "index.html");
      info = await stat(file);
    }
    res.writeHead(200, {
      "content-type": types[extname(file).toLowerCase()] ?? "application/octet-stream",
      "content-length": info.size,
      "cache-control": "no-store",
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
  } catch {
    send(res, 404, "Not Found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root.split(sep).join("/")} at http://127.0.0.1:${port}/`);
});
