import { ExportDefinition } from "../types";

export const exportDefinitions: ExportDefinition[] = [
  {
    key: "StatEvent",
    batchSize: 2000,
    source: {
      schema: "public",
      table: "StatEvent",
      cursor: {
        field: "created_at",
        idField: "id",
      },
      columns: [
        "id",
        "type",
        "created_at",
        "updated_at",
        "click_id",
        "referer",
        "host",
        "is_bot",
        "is_human",
        "source",
        "source_id",
        "from_publisher_id",
        "to_publisher_id",
        "mission_id",
        "mission_client_id",
        "tag",
        "tags",
        "status",
        "custom_attributes",
      ],
    },
    destination: {
      table: "StatEvent",
      conflictColumns: ["id"],
    },
  },
];
