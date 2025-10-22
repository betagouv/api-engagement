import { PoolClient } from "pg";

export interface BulkUpsertOptions {
  table: string;
  schema?: string;
  conflictColumns: string[];
}

const formatIdentifier = (identifier: string) => {
  return identifier
    .split(".")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(".");
};

export interface SelectQueryOptions {
  table: string;
  schema?: string;
  cursorField: string;
  columns?: string[];
}

export const buildSelectQuery = (options: SelectQueryOptions) => {
  const tableName = options.schema ? `${formatIdentifier(options.schema)}.${formatIdentifier(options.table)}` : formatIdentifier(options.table);
  const cursorField = formatIdentifier(options.cursorField);
  const columns = options.columns && options.columns.length > 0 ? options.columns.map((column) => formatIdentifier(column)).join(", ") : "*";
  const orderByClause = `ORDER BY ${cursorField} ASC`;

  return `
    SELECT ${columns}
    FROM ${tableName}
    WHERE ($1::timestamp IS NULL OR ${cursorField} > $1::timestamp)
    ${orderByClause}
    LIMIT $2
  `;
};

export const bulkUpsert = async (client: PoolClient, rows: Record<string, any>[], options: BulkUpsertOptions) => {
  if (!rows.length) {
    return { rowCount: 0 };
  }

  const columns = Object.keys(rows[0]);
  if (!columns.length) {
    throw new Error("bulkUpsert called without columns");
  }

  const conflictColumns = options.conflictColumns;
  if (!conflictColumns.length) {
    throw new Error("bulkUpsert requires at least one conflict column");
  }

  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));

  const values: any[] = [];
  const rowPlaceholders: string[] = [];

  rows.forEach((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      values.push(row[column] ?? null);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    rowPlaceholders.push(`(${placeholders.join(", ")})`);
  });

  const tableName = options.schema ? `${formatIdentifier(options.schema)}.${formatIdentifier(options.table)}` : formatIdentifier(options.table);
  const columnList = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
  const conflictClause = conflictColumns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
  const updateClause =
    updateColumns.length > 0 ? "UPDATE SET " + updateColumns.map((column) => `"${column.replace(/"/g, '""')}" = EXCLUDED."${column.replace(/"/g, '""')}"`).join(", ") : "NOTHING";

  const sql = `
    INSERT INTO ${tableName} (${columnList})
    VALUES ${rowPlaceholders.join(", ")}
    ON CONFLICT (${conflictClause})
    DO ${updateClause}
  `;

  const result = await client.query(sql, values);

  return { rowCount: result.rowCount };
};
