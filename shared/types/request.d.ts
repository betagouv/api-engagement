/**
 * Interface représentant une requ00eate HTTP
 */
export interface Request {
  _id?: string;
  route: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  method: "GET" | "POST" | "PUT" | "DELETE";
  key?: string;
  header?: Record<string, any>;
  body?: Record<string, any>;
  status?: number;
  code?: string;
  message?: string;
  total?: number;
  createdAt?: Date;
}
