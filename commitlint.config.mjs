// Conventional Commits 1.0: https://www.conventionalcommits.org/en/v1.0.0/
// CI lints every pull request title and every commit in the pull request (see
// CONTRIBUTING.md, "Commits and PR titles"). Merge commits ("Merge branch 'main'
// into …") are ignored by commitlint's defaults.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Types are the config-conventional set: build, chore, ci, docs, feat, fix,
    // perf, refactor, revert, style, test. Scopes are optional and free-form
    // (css, tokens, examples, web-components, docs, demos, ci, deps, …).
    "type-case": [2, "always", "lower-case"],
    "scope-case": [2, "always", "lower-case"],
    // The description starts lowercase; proper nouns later in the line are fine.
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 100],
    // Bodies and footers carry URLs and squash-merged PR descriptions: no wrap limit.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
