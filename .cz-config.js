module.exports = {
  types: [
    { value: "feat", name: "feat:     Nouvelle fonctionnalité" },
    { value: "refactor", name: "refactor: Refactorisation de code" },
    { value: "fix", name: "fix:      Correction de bug" },
    { value: "chore", name: "chore:    Tâche de maintenance" },
    { value: "test", name: "test:     Ajout ou mise à jour de tests" },
    { value: "ci", name: "ci:     Ajout ou mise à jour du process de déploiement" },
  ],
  scopes: ["app", "api", "analytics", "widget", "jobs", "ci", "deps"],
  allowTicketNumber: false,
  allowCustomScopes: false,
  allowCustomIssuePrefix: false,
  allowBreakingChanges: ["feat", "refactor", "fix"],
  upperCaseSubject: false,
  skipQuestions: ["body", "breaking", "footer"],
  subjectLimit: 72,
};
