// Conventional Commits drive the version bot (release-please):
// fix -> patch, feat -> minor, feat! / BREAKING CHANGE -> major
// (minor while the version is 0.x). Scopes are free-form (core, web, deploy...).
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Long technical bodies and URLs are fine.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
