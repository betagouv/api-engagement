export type MetabaseQueryResponse = {
  ok: boolean;
  data: { rows: unknown[][]; cols: { name: string; display_name?: string }[] };
};

export type MetabasePoint = { name: string; value: number };
