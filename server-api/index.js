const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const app = express();
const NRP = require("node-redis-pubsub");
const PORT = 4444;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// just for test
app.get("/", (req, res) => {
  return res.status(200).json({ message: "Hi! You're connected!" });
});

// getting info about forex from web scraping
app.get("/forex", (req, res) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(404).json({
      message: "symbol missing",
    });
  }

  // create redis connection
  const nrp = new NRP({
    host: "redis-server",
    PORT: 6379,
    scope: "microservice",
  });

  console.log("symbol ", symbol);
  // send forex symbol to web scraping service
  nrp.emit("GET_FOREX_INFO", { symbol: symbol });

  // listen for result of forex info and return response
  nrp.on("RESPONSE_FOREX_INFO", (data) => {
    res.json({ data: data });
    return nrp.end();
  });

  return;
});

app.listen(PORT, () => {
  console.log(`Server at ${PORT}`);
});
