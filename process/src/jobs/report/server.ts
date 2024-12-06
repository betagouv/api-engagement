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

  // Send complete HTML with hydration scripts
  res.send(`
    <!DOCTYPE html>
    ${html.replace(
      "</body>",
      `
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({ data: result.data, publisher: result.publisher, year, month })};
      </script>
      </body>
    `,
    )}
  `);
});

export default app;
