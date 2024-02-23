import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import balance from "./router/balancesheet";
import cors from "cors";
import "../newBackend/database";

const winston = require('winston');
const expressWinston = require('express-winston');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(bodyParser.json());
app.use(cors());

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'C:/Users/Admin/Desktop/new 2/newBackend/api_logs.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
}));

app.use("/api", balance);

app.listen(3100, () => {
  console.log(`Server is running on port ${3100}`);
});
