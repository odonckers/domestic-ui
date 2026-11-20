#!/usr/bin/env node
/*
 * Tiny zero-dependency static server for the demo apps.
 *   node serve.mjs --root <dir> [--port 4300] [--spa]
 * Read-only, GET/HEAD only, no directory listing.
 * "/foo/" serves "/foo/index.html". With --spa, an extensionless path that
 * matches no file serves "/index.html" (client-side routing fallback).
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    root: { type: "string" },
    port: { type: "string", default: process.env.PORT ?? "4300" },
    spa: { type: "boolean", default: false },
  },
});
if (!values.root) {
  console.error("Usage: node serve.mjs --root <dir> [--port <n>] [--spa]");
  process.exit(1);
}

const root = resolve(values.root);
const port = Number(values.port);

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
  ".txt": "text/plain; charset=utf-8",
};

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
};

/** Resolve a URL path to a file, or null. Directories resolve to their index.html. */
async function find(pathname) {
  const file = normalize(join(root, pathname));
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return { file, info };
    if (info.isDirectory()) {
      if (!pathname.endsWith("/")) return { redirect: `${pathname}/` };
      const index = join(file, "index.html");
      return { file: index, info: await stat(index) };
    }
  } catch {
    // Not found.
  }
  return null;
}

createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method Not Allowed");

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "Bad Request");
  }

  let found = await find(pathname);
  if (!found && values.spa && !extname(pathname)) found = await find("/index.html");
  if (!found) return send(res, 404, "Not Found");
  if (found.redirect) {
    res.writeHead(301, { location: found.redirect });
    return res.end();
  }

  res.writeHead(200, {
    "content-type": types[extname(found.file).toLowerCase()] ?? "application/octet-stream",
    "content-length": found.info.size,
    "cache-control": "no-store",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(found.file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root.split(sep).join("/")} at http://127.0.0.1:${port}/${values.spa ? " (SPA fallback)" : ""}`);
});
