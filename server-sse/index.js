const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const { WebSocket } = require("ws");
// const deriv = require("./deriv.js");
const app = express();
const PORT = 4445;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const app_id = 1089;
const ws = new WebSocket(
  "wss://ws.binaryws.com/websockets/v3?app_id=" + app_id
);
var stream_ids = [];

// just for test
// app.get("/", (req, res) => {
//   return res.status(200).json({ message: "Hi! You're connected!" });
// });
// deriv.ws.on("open", () => {
//   console.log("deriv server is connected");
//   deriv.ws.send(
//     JSON.stringify({
//       ticks: "R_50",
//       subscribe: 1,
//     })
//   );
// });

ws.on("open", () => {
  console.log("connection is open");
  //   ws.on("message", (msg) => {
  //     console.log("msg ", JSON.parse(msg));
  //   });

  app.get("/", (req, res) => {
    return res.status(200).json({ message: "Hi! You're connected!" });
  });

  app.get("/forexStream", (req, res) => {
    const { symbol } = req.query;
    if (stream_ids.length === 0) {
      ws.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
        })
      );
    }

    ws.on("message", (msg) => {
      console.log("msg in");
      return res.status(200).json({ message: "message here" });
    });
  });
});

// app.get("/forexStream", (req, res) => {
//   const { symbol } = req.query;
//   const ws = new WebSocket(
//     "wss://ws.binaryws.com/websockets/v3?app_id=" + 1089
//   );
//   console.log("req received, sym: ", symbol);
//   if (stream_ids.length === 0) {
//     console.log("ws ", deriv.ws);
//     console.log("stream ids is empty");
//     ws.on("open", () => {
//       console.log("deriv server is connected");
//       ws.send(
//         JSON.stringify({
//           ticks: symbol,
//           subscribe: 1,
//         })
//       );
//     });
//   }
//   console.log("hello");
//   ws.onmessage = (msg) => {
//     let data = JSON.parse(msg.data);
//     console.log("in ", data);

//     stream_ids.push(data.subscription.id);
//     console.log("sub id ", stream_ids);

//     closeStream(stream_ids[0]);
//   };
// });

app.listen(PORT, () => {
  console.log(`Server at ${PORT}`);
});

const closeStream = (stream_id) => {
  console.log("closing ", typeof stream_id);
  ws.send(
    JSON.stringify({
      forget: stream_id,
    })
  );
};
