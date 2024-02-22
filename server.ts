import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import balance from "./router/balancesheet";
import cors from "cors"

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors())

app.use("/api", balance);

app.listen(3100, () => {
  console.log(`Server is running on port ${3100}`);
});
