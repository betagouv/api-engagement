import api from "../../../api";

export const queryCard = async (cardId, { parameters = [], variables = {}, body = {}, signal } = {}) => {
  const payload = { ...body };
  if (parameters?.length) payload.parameters = parameters;
  if (variables && Object.keys(variables).length) payload.variables = variables;

  return api.post(`/metabase/card/${cardId}/query`, payload, { signal });
};

export const queryWithTemplateVars = async (cardId, variables = {}, options = {}) => {
  const parameters = Object.entries(variables).map(([key, value]) => ({
    type: Array.isArray(value) ? "date/range" : "string/=",
    target: ["variable", ["template-tag", key]],
    value,
  }));

  return queryCard(cardId, { ...options, parameters });
};
