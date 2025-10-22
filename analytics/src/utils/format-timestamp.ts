const pad = (value: number, size = 2) => value.toString().padStart(size, "0");

const formatDateTime = (date: Date) => {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  );
};

const formatTimestamp = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  const parsed = new Date(value as any);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateTime(parsed);
};

export default formatTimestamp;
