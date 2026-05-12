const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

type TrancheAgeValueKey = "moins_26_ans" | "moins_31_ans_handicap" | "entre_17_72_ans" | "entre_16_67_ans";

export const resolveTrancheAgeValues = (params: unknown): TrancheAgeValueKey[] => {
  if (!isRecord(params)) {
    throw new Error("tranche_age params must be an object");
  }

  const age = params.age;
  const handicap = params.handicap ?? false;

  if (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 120) {
    throw new Error("tranche_age.age must be an integer between 0 and 120");
  }

  if (typeof handicap !== "boolean") {
    throw new Error("tranche_age.handicap must be a boolean");
  }

  const values: TrancheAgeValueKey[] = [];

  if (age < 26) {
    values.push("moins_26_ans");
  }

  if (age < 31 && handicap) {
    values.push("moins_31_ans_handicap");
  }

  if (age >= 17 && age <= 72) {
    values.push("entre_17_72_ans");
  }

  if (age >= 16 && age < 67) {
    values.push("entre_16_67_ans");
  }

  return values;
};
