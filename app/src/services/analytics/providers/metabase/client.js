import api from "@/services/api";

export const queryCard = async (cardId, { variables = {}, signal } = {}) => {
  const payload = {};
  if (variables && Object.keys(variables).length) payload.variables = variables;

  return api.post(`/metabase/card/${cardId}/query`, payload, { signal });
};
