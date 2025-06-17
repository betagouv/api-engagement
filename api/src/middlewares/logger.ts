import chalk from "chalk";
import morgan from "morgan";
import { Publisher, User } from "../types";

const METHOD_COLORS = {
  GET: "green",
  POST: "yellow",
  PUT: "blue",
  DELETE: "red",
} as const;

const logger = morgan(function (tokens, req, res) {
  const method = tokens.method(req, res) as keyof typeof METHOD_COLORS;
  const methodColor = METHOD_COLORS[method] || "white";
  const statusColor = res.statusCode >= 500 ? "red" : res.statusCode >= 400 ? "yellow" : "green";

  const user = (req as any).user as User | Publisher;
  // hide GET / requests
  if (tokens.method(req, res) === "GET" && tokens.url(req, res) === "/") {
    return null;
  }

  const isUser = user ? "firstname" in user : false;

  return [
    chalk[methodColor].bold(method),
    chalk.white.bold(tokens.url(req, res)),
    chalk[statusColor].bold(tokens.status(req, res)),
    `- ${tokens["response-time"](req, res)}ms ${user ? (isUser ? `user-id:${user._id}` : `publisher-id:${user._id}`) : ""}`,
  ].join(" ");
});

export default logger;
