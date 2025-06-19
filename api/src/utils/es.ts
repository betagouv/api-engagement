import { EsQuery } from "../types";

export const buildTerm = (field: string, value: string) => ({
  term: { [`${field}.keyword`]: value },
});
export const buildMatchPrefix = (field: string, value: string) => {
  if (value.trim().split(" ").length > 1) {
    return {
      match_phrase_prefix: {
        [field]: { query: value.trim(), analyzer: "french", max_expansions: 3 },
      },
    };
  }
  return {
    match_bool_prefix: { [field]: { query: value.trim(), analyzer: "french", max_expansions: 3 } },
  };
};

export const buildQuery = (rules: { field: string; operator: string; value: string; combinator: "and" | "or" }[]) => {
  const q = { bool: { must: [], must_not: [], should: [], filter: [] } } as EsQuery;
  rules.forEach((r: { field: string; operator: string; value: string; combinator: string }, i: number) => {
    if (!r.field || !r.operator || (!r.value && r.operator !== "exists" && r.operator !== "does_not_exist")) {
      return;
    }
    if (i === 0 && rules.length > 1) {
      r.combinator = rules[1].combinator;
    }

    if (r.combinator === "and") {
      if (r.operator === "is") {
        q.bool.must.push(buildTerm(r.field, r.value));
      } else if (r.operator === "is_not") {
        q.bool.must_not.push(buildTerm(r.field, r.value));
      } else if (r.operator === "contains") {
        q.bool.must.push(buildMatchPrefix(r.field, r.value));
      } else if (r.operator === "does_not_contain") {
        q.bool.must_not.push(buildMatchPrefix(r.field, r.value));
      } else if (r.operator === "is_greater_than") {
        q.bool.must.push({ range: { [r.field]: { gt: r.value } } });
      } else if (r.operator === "is_less_than") {
        q.bool.must.push({ range: { [r.field]: { lt: r.value } } });
      } else if (r.operator === "exists") {
        q.bool.must.push({ exists: { field: r.field } });
      } else if (r.operator === "does_not_exist") {
        q.bool.must_not.push({ exists: { field: r.field } });
      } else if (r.operator === "starts_with") {
        q.bool.must.push(buildMatchPrefix(r.field, r.value));
      }
    } else if (r.combinator === "or") {
      if (r.operator === "is") {
        q.bool.should.push(buildTerm(r.field, r.value));
      } else if (r.operator === "is_not") {
        q.bool.should.push({ bool: { must_not: buildTerm(r.field, r.value) } });
      } else if (r.operator === "contains") {
        q.bool.should.push(buildMatchPrefix(r.field, r.value));
      } else if (r.operator === "does_not_contain") {
        q.bool.should.push({ bool: { must_not: buildMatchPrefix(r.field, r.value) } });
      } else if (r.operator === "is_greater_than") {
        q.bool.should.push({ range: { [r.field]: { gt: r.value } } });
      } else if (r.operator === "is_less_than") {
        q.bool.should.push({ range: { [r.field]: { lt: r.value } } });
      } else if (r.operator === "exists") {
        q.bool.should.push({ exists: { field: r.field } });
      } else if (r.operator === "does_not_exist") {
        q.bool.should.push({ bool: { must_not: { exists: { field: r.field } } } });
      } else if (r.operator === "starts_with") {
        q.bool.should.push(buildMatchPrefix(r.field, r.value));
      }
    }
  });

  if (q.bool.should.length > 1) {
    q.bool.minimum_should_match = 1;
  }
  return q;
};
