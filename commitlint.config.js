module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["domain", "application", "infrastructure", "adapters", "logging", "ci", "deps"],
    ],
    "scope-empty": [0],
  },
};
