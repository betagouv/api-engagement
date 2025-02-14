import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 8080;

console.log(process.env);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "../dist")));

app.get("/linkedin.xml", function (req, res) {
  res.redirect(301, "https://api-engagement-bucket.s3.fr-par.scw.cloud/xml/linkedin.xml");
});

app.route("*").all((req, res) => {
  res.status(200).sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log(`App listening at port:${port}`);
});
