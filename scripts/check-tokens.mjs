#!/usr/bin/env node
/*
 * Token discipline check (`npm run lint:tokens`).
 *
 * Rules:
 * 1. Outside css/tokens/, CSS may reference only semantic --dui-* tokens
 *    (those declared in css/tokens/semantic.css). Primitive tokens and
 *    unknown --dui-* names fail.
 * 2. Outside css/tokens/, declaration values may not contain literal
 *    colors (hex, color functions, named colors) or literal lengths,
 *    durations or angles. Allowed: 0, 1px hairlines, percentages, fr,
 *    unitless numbers, keywords such as currentcolor/inherit/transparent,
 *    and CSS system colors (for forced-colors mode).
 * 3. css/tokens/semantic.css may not contain literal colors: it must
 *    point at primitives.
 * 4. css/tokens/primitives.css must only declare --dui-* properties.
 *
 * Zero dependencies on purpose.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cssDir = join(root, "css");
const tokensDir = join(cssDir, "tokens");

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/* Collect `--dui-*: value;` declarations. */
const declaredTokens = (css) => new Set([...css.matchAll(/(--dui-[\w-]+)\s*:/g)].map((m) => m[1]));

/* Find `property: value` declarations with their line numbers. */
function* declarations(css) {
  const re = /([-\w]+)\s*:\s*([^;{}]+?)\s*(?=[;}])/g;
  for (const m of css.matchAll(re)) {
    const line = css.slice(0, m.index).split("\n").length;
    yield { property: m[1], value: m[2], line };
  }
}

// https://drafts.csswg.org/css-color/#named-colors
const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
  burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
  darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
  darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro
  ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
  lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
  lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
  mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
  mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
  orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru
  pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
  seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
  teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/),
);

const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX = /#[0-9a-f]{3,8}\b/i;
const DIMENSION = /(?<![\w.#-])(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|ex|ch|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|svh|lvh|dvh|svw|lvw|dvw|cqw|cqh|cqi|cqb|cqmin|cqmax|pt|pc|cm|mm|q|in|ms|s|deg|rad|grad|turn)\b/gi;

const literalColor = (value) => {
  const bare = value.replace(/var\(\s*--[\w-]+/g, "var(").replace(/"[^"]*"|'[^']*'/g, "");
  if (HEX.test(bare)) return bare.match(HEX)[0];
  if (COLOR_FUNCTION.test(bare)) return bare.match(COLOR_FUNCTION)[0];
  const word = bare.toLowerCase().match(/[a-z]+/g)?.find((w) => NAMED_COLORS.has(w));
  return word ?? null;
};

const literalDimension = (value) => {
  const bare = value.replace(/var\(\s*--[\w-]+/g, "var(").replace(/"[^"]*"|'[^']*'/g, "");
  for (const m of bare.matchAll(DIMENSION)) {
    const number = Number.parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (number === 0) continue;
    if (Math.abs(number) === 1 && unit === "px") continue;
    return m[0];
  }
  return null;
};

const problems = [];
const report = (file, line, message) => problems.push(`${relative(root, file).split(sep).join("/")}:${line}  ${message}`);

const primitivesFile = join(tokensDir, "primitives.css");
const semanticFile = join(tokensDir, "semantic.css");
const primitivesCss = stripComments(readFileSync(primitivesFile, "utf8"));
const semanticCss = stripComments(readFileSync(semanticFile, "utf8"));
const primitives = declaredTokens(primitivesCss);
const semantics = declaredTokens(semanticCss);

for (const name of semantics) {
  if (primitives.has(name)) report(semanticFile, 1, `${name} is declared as both a primitive and a semantic token`);
}

for (const { property, line } of declarations(primitivesCss)) {
  if (!property.startsWith("--dui-")) report(primitivesFile, line, `primitives may only declare --dui-* tokens, found "${property}"`);
}

for (const { property, value, line } of declarations(semanticCss)) {
  const color = literalColor(value);
  if (color) report(semanticFile, line, `${property}: literal color "${color}"; point at a primitive instead`);
}

for (const file of walk(cssDir)) {
  if (file.startsWith(tokensDir + sep)) continue;
  const css = stripComments(readFileSync(file, "utf8"));

  for (const m of css.matchAll(/var\(\s*(--dui-[\w-]+)/g)) {
    const line = css.slice(0, m.index).split("\n").length;
    const name = m[1];
    if (primitives.has(name)) report(file, line, `uses primitive token ${name}; use a semantic token`);
    else if (!semantics.has(name)) report(file, line, `unknown token ${name}`);
  }

  for (const { property, value, line } of declarations(css)) {
    if (property.startsWith("--dui-")) {
      report(file, line, `declares ${property}; --dui-* tokens live in css/tokens/ only`);
      continue;
    }
    if (property === "syntax" || property === "inherits") continue; // @property descriptors
    const color = literalColor(value);
    if (color) report(file, line, `${property}: literal color "${color}"; use a semantic token`);
    const dimension = literalDimension(value);
    if (dimension) report(file, line, `${property}: literal size "${dimension}"; use a semantic token`);
  }
}

if (problems.length) {
  console.error(`Token check failed (${problems.length}):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Token check passed: ${semantics.size} semantic tokens, ${primitives.size} primitives, no primitives or literals outside css/tokens/.`);
