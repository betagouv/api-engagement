// Calcule un score normalisé entre 0 et 100 à partir des réponses
export function computeScore(answers: string[], questions: { id: string; correctAnswerId?: string }[]): number {
  if (!questions.length) return 0;

  const correct = questions.filter((q) => q.correctAnswerId && answers.includes(q.correctAnswerId)).length;

  return Math.round((correct / questions.length) * 100);
}

// Associe un score à une catégorie de résultat
export function categorize(score: number): "debutant" | "intermediaire" | "expert" {
  if (score < 40) return "debutant";
  if (score < 75) return "intermediaire";
  return "expert";
}
