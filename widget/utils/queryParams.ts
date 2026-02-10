export const getQueryValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export const getQueryValues = (value?: string | string[]) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => item.split(","));
};
