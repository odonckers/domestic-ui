// @ts-check
/*
 * Small helpers shared by the docs build. Zero dependencies.
 */
import { posix } from "node:path";

export const SITE_URL = "https://odonckers.github.io/domestic-ui/";
export const REPO_URL = "https://github.com/odonckers/domestic-ui";
export const BLOB_URL = `${REPO_URL}/blob/main/`;
export const EDIT_URL = `${REPO_URL}/edit/main/`;
/** The GitHub release page for a version tag. @param {string} version e.g. "0.1.0" */
export const releaseUrl = (version) => `${REPO_URL}/releases/tag/v${version}`;
/** The source archive GitHub attaches to every release. @param {string} version */
export const archiveUrl = (version) => `${REPO_URL}/archive/refs/tags/v${version}.zip`;
export const RAW_URL = "https://raw.githubusercontent.com/odonckers/domestic-ui/main/";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for HTML element content and attribute values. @param {string} text */
export const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Reverse escapeHtml (plus the numeric forms). Only used to read <title>
 * text and by tests that compare escaped code with its source.
 * @param {string} text
 */
export const unescapeHtml = (text) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&amp;/g, "&");

/**
 * Heading text to an id: lowercase ASCII words joined by hyphens.
 * Inline markup and leading "1." numbering are dropped.
 * @param {string} text
 */
export const slugify = (text) =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*\d+\.\s+/, "")
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");

/** Codepoint order, so output never depends on the machine's locale. @param {string} a @param {string} b */
export const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Relative URL from one site page to another site path, both relative to the site root.
 * @param {string} fromPage e.g. "principles/theming.html"
 * @param {string} target   e.g. "examples/theming.html#x"
 */
export function relativeUrl(fromPage, target) {
  const [path, hash = ""] = target.split(/(?=#)/);
  if (!path) return hash;
  const rel = posix.relative(posix.dirname(fromPage), path);
  return (rel || posix.basename(path)) + hash;
}

/** "Base elements · domestic-ui" → "Base elements". @param {string} html */
export function readTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? unescapeHtml(m[1]).trim().replace(/\s+/g, " ") : "";
}

/** First sentence of a block of prose. @param {string} text */
export function firstSentence(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  const m = flat.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : flat;
}

/**
 * A Markdown code fence longer than any backtick run inside the code,
 * so the code is never cut short (CommonMark fenced code blocks).
 * @param {string} code
 * @param {string} [lang]
 */
export function fence(code, lang = "") {
  const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${code}\n${ticks}`;
}

/** Escape text for a Markdown table cell or inline run. @param {string} text */
export const escapeMdCell = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/**
 * Wrap text in an inline code span that survives backticks inside it.
 * @param {string} text
 */
export function mdCode(text) {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${ticks}${pad}${text}${pad}${ticks}`;
}
