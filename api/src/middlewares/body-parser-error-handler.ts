import { NextFunction, Request, Response } from "express";

const bodyParserErrorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).send({ ok: false, code: "INVALID_BODY" });
  }
  next(err);
};

export default bodyParserErrorHandler;
