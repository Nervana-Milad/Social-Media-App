import * as dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.resolve("./src/config/.env.dev") });
import express from "express";
import bootstrap from "./src/app.controller.js";
const app = express();
const port = process.env.PORT || 5000;

bootstrap(app, express);
app.listen(port, () => {
  console.log(`Example is running on port ${port}`);
});
