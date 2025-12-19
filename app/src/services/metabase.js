import api from "./api";

class MetabaseClient {
  async queryCard(cardId, { parameters = [], variables = {}, body = {}, signal } = {}) {
    const payload = { ...body };
    if (parameters?.length) payload.parameters = parameters;
    if (variables && Object.keys(variables).length) payload.variables = variables;

    return api.post(`/metabase/card/${cardId}/query`, payload, { signal });
  }

  async queryWithTemplateVars(cardId, variables = {}, options = {}) {
    const parameters = Object.entries(variables).map(([key, value]) => ({
      type: Array.isArray(value) ? "date/range" : "string/=",
      target: ["variable", ["template-tag", key]],
      value,
    }));

    return this.queryCard(cardId, { ...options, parameters });
  }
}

const metabase = new MetabaseClient();
export default metabase;
