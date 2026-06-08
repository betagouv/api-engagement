import type { SearchCollectionSchema } from "@/services/search/types";

import { ensureCollection } from "./providers/typesense/utils";

export const ensureSearchCollection = (schema: SearchCollectionSchema): Promise<void> => ensureCollection(schema);
