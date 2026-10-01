import type { ActionFunctionArgs } from "react-router";

import { createApi } from "~/services/api";

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;
  const api = createApi(request);
  if (!id) return api.json({ ok: false, code: "MISSING_ID" }, { status: 400 });
  try {
    const body = await request.json();
    await api.put(`/user-scoring/${id}`, body);
    return api.json({ ok: true, data: null });
  } catch (error) {
    return api.error(error);
  }
}
