const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

type TrancheAgeValueKey =
  | "moins_18_ans"
  | "entre_18_25_ans"
  | "entre_25_30_ans"
  | "entre_30_45_ans"
  | "entre_46_67_ans"
  | "entre_68_72_ans"
  | "plus_72_ans"
  | "moins_31_ans_handicap";

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

  if (age < 18) {
    values.push("moins_18_ans");
  } else if (age <= 25) {
    values.push("entre_18_25_ans");
  } else if (age <= 30) {
    values.push("entre_25_30_ans");
  } else if (age <= 45) {
    values.push("entre_30_45_ans");
  } else if (age <= 67) {
    values.push("entre_46_67_ans");
  } else if (age <= 72) {
    values.push("entre_68_72_ans");
  } else {
    values.push("plus_72_ans");
  }

  if (age < 31 && handicap) {
    values.push("moins_31_ans_handicap");
  }

  return values;
};
