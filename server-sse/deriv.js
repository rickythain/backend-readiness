const { WebSocket } = require("ws");
const app_id = 1089;
const ws = new WebSocket(
  "wss://ws.binaryws.com/websockets/v3?app_id=" + app_id
);

module.exports = {
  ws,
};
