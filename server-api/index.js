const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const app = express();
const NRP = require("node-redis-pubsub");
const Redis = require("ioredis");
const hash = require("hash-it");
const PORT = 4444;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// just for test
app.get("/", (req, res) => {
  // let reqId = hash(req.rawHeaders.toString() + Date.now().toString());
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
  console.log("hihiih");
  return;
});

//get forex symbol tick stream
app.get("/forex/tick", (req, res) => {
  let reqId = hash(req.rawHeaders.toString() + Date.now().toString());
  const { symbol } = req.query;
  res.setHeader("Content-Type", "text/event-stream");

  res.write("byeee \n\n");
  const sub = new Redis({
    host: "redis-server",
    PORT: 6379,
  });
  const pub = new Redis({
    host: "redis-server",
    PORT: 6379,
  });
  const tickSub = new Redis({
    host: "redis-server",
    PORT: 6379,
  });
  const redis = new Redis({
    host: "redis-server",
    PORT: 6379,
  });

  pub.publish(
    "FOREX_IS_CONNECTION_ON",
    JSON.stringify({ id: reqId, symbol: symbol })
  );

  sub.subscribe("CONNECTION_CHANNEL", (err, count) => {
    if (err) {
      console.error("Failed to subscribe: %s", err.message);
    } else {
      console.log(`Subscribed successfully! Num of sub channels: ${count}`);
    }
  });

  sub.on("message", (channel, message) => {
    message = JSON.parse(message);

    if (channel === "CONNECTION_CHANNEL") {
      // console.log("current id: ", reqId);

      // get only messages for the current ID
      if (message.id === reqId) {
        console.log("msg on channel: ", message.id, reqId);
        let tick_channel = message.channel;
        tickSub.config("SET", "notify-keyspace-events", "KEA");
        //TO-DO: unsub any existing subbed tick_ channel
        tickSub.subscribe("__keyevent@0__:set", tick_channel, (err, count) => {
          if (err) console.log("err :", err);
          else console.log("connected to keyevent! ", count);
        });

        // get notification on set event on redis key
        tickSub.on("message", (channel, key) => {
          // console.log(`from ${channel} message: ${key}`);

          if (key === tick_channel) {
            redis.get(key).then((result, err) => {
              console.log("result ", JSON.parse(result));
              // res.write("heelooooo \n\n");
            });
          }
        });
      }
    }
  });
});

// test
app.post("/login", (req, res) => {
  console.log(req.body);
  res.json({ message: "suc" });
});

// test sse
app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  send(res);
});

let i = 0;
function send(res) {
  res.write("data: " + `hello ${i}! \n\n`);
  i++;
  setTimeout(() => send(res), 1000);
}

function sendRes(res) {
  res.write("data " + `byeee \n\n`);
}

app.listen(PORT, () => {
  console.log(`Server at ${PORT}`);
});
