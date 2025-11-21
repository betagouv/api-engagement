import { Request } from "express";

export interface UserRequest extends Request {
  user?: any;
}
export interface PublisherRequest extends Request {
  user?: any;
}
