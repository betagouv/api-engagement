import { NextFunction, Request, Response } from "express";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../utils/request-id";

const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header(REQUEST_ID_HEADER);
  const id = getOrCreateRequestId(incoming);

  (req as any).requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  next();
};

export default requestId;
