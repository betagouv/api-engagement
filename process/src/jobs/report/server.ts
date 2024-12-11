import express from "express";
import React from "react";
import { renderToString } from "react-dom/server";
import path from "path";

import { fetchData } from "./generate";
import ReactApp from "./pages";

const app = express();
app.use(express.static(path.join(__dirname, "pages/static")));

app.get("/report/:id", async (req, res) => {
  const { id } = req.params;
  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);

  console.log(`[Report] Fetching data for ${id} ${year}-${month}`);
  const result = await fetchData(id, year, month);
  if (!result) {
    res.status(404).send("Data not found");
    return;
  }
  const element = React.createElement(ReactApp, { data: result.data, publisher: result.publisher, year, month });
  const html = renderToString(element);
  res.send(html);
});

export default app;
