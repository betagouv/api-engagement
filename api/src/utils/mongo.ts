export const diacriticSensitiveRegex = (string: string = "") => {
  return string
    .replace(/a/g, "[a,á,à,ä,â]")
    .replace(/A/g, "[A,a,á,à,ä,â]")
    .replace(/e/g, "[e,é,ë,è]")
    .replace(/E/g, "[E,e,é,ë,è]")
    .replace(/i/g, "[i,í,ï,ì]")
    .replace(/I/g, "[I,i,í,ï,ì]")
    .replace(/o/g, "[o,ó,ö,ò]")
    .replace(/O/g, "[O,o,ó,ö,ò]")
    .replace(/u/g, "[u,ü,ú,ù]")
    .replace(/U/g, "[U,u,ü,ú,ù]");
};

export const buildQueryMongo = (rules: { field: string; operator: string; value: string; combinator: "and" | "or" }[]) => {
  const q = { $and: [], $or: [] } as { [key: string]: any };
  rules.forEach((r: { field: string; operator: string; value: string; combinator: string }, i: number) => {
    if (!r.field || !r.operator || (!r.value && r.operator !== "exists" && r.operator !== "does_not_exist")) {
      return;
    }
    if (i === 0 && rules.length > 1) {
      r.combinator = rules[1].combinator;
    }

    if (r.combinator === "and") {
      if (r.operator === "is") {
        q.$and.push({ [r.field]: r.value });
      } else if (r.operator === "is_not") {
        q.$and.push({ [r.field]: { $ne: r.value } });
      } else if (r.operator === "contains") {
        q.$and.push({ [r.field]: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } });
      } else if (r.operator === "does_not_contain") {
        q.$and.push({
          [r.field]: { $not: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } },
        });
      } else if (r.operator === "is_greater_than") {
        q.$and.push({ [r.field]: { $gt: r.value } });
      } else if (r.operator === "is_less_than") {
        q.$and.push({ [r.field]: { $lt: r.value } });
      } else if (r.operator === "exists") {
        q.$and.push({ [r.field]: { $exists: true } });
      } else if (r.operator === "does_not_exist") {
        q.$and.push({ [r.field]: { $exists: false } });
      } else if (r.operator === "starts_with") {
        q.$and.push({
          [r.field]: { $regex: `^${diacriticSensitiveRegex(r.value)}`, $options: "i" },
        });
      }
    } else if (r.combinator === "or") {
      if (r.operator === "is") {
        q.$or.push({ [r.field]: r.value });
      } else if (r.operator === "is_not") {
        q.$or.push({ [r.field]: { $ne: r.value } });
      } else if (r.operator === "contains") {
        q.$or.push({ [r.field]: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } });
      } else if (r.operator === "does_not_contain") {
        q.$or.push({
          [r.field]: { $not: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } },
        });
      } else if (r.operator === "is_greater_than") {
        q.$or.push({ [r.field]: { $gt: r.value } });
      } else if (r.operator === "is_less_than") {
        q.$or.push({ [r.field]: { $lt: r.value } });
      } else if (r.operator === "exists") {
        q.$or.push({ [r.field]: { $exists: true } });
      } else if (r.operator === "does_not_exist") {
        q.$or.push({ [r.field]: { $exists: false } });
      } else if (r.operator === "starts_with") {
        q.$or.push({
          [r.field]: { $regex: `^${diacriticSensitiveRegex(r.value)}`, $options: "i" },
        });
      }
    }
  });

  return q;
};

export const isValidObjectId = (id: string) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};
