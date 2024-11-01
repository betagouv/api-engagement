import { Request } from "express";

export interface UserRequest extends Request {
  user?: any;
}
export interface PublisherRequest extends Request {
  user?: any;
}

declare global {
  namespace Express {
    interface User extends User {
      _id: string;
      role: string;
      publishers: string[];
    }
  }
}
