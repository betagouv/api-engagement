module.exports = {
  rules: {
    "type-enum": [2, "always", ["feat", "refactor", "fix", "chore", "test"]],
    "type-empty": [2, "never"],
    "scope-enum": [2, "always", ["app", "api", "analytics", "widget", "jobs", "ci", "release"]],
    "scope-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "subject-max-length": [2, "always", 72],
  },
};
