const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const webrtc = require("wrtc");
const WebSocket = require("ws");
const http = require("http");
let broadcasterStreams = []; // To store broadcaster streams
let consumerConnections = new Set(); // To store consumer connections

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("New ws client connected");
  console.log("data: " + JSON.stringify(broadcasterStreams));
  ws.send(JSON.stringify(broadcasterStreams));
});

app.post("/consumer", async ({ body }, res) => {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  });
  const desc = new webrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);

  broadcasterStreams.forEach((stream) => {
    stream.stream
      .getTracks()
      .forEach((track) => peer.addTrack(track, stream.stream));
  });
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription,
  };

  consumerConnections.add(peer); // Store the consumer connection

  res.json(payload);
});

app.post("/broadcast", async ({ body }, res) => {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  });
  peer.ontrack = (e) => handleTrackEvent(e);
  const desc = new webrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription,
  };
  //sendBroadcasterStreamsUpdate();
  res.json(payload);
});

function handleTrackEvent(e) {
  const stream = e.streams[0];
  console.log(
    "handle Track event, before add stream" + JSON.stringify(broadcasterStreams)
  );
  broadcasterStreams.push({
    id: stream.id,
    stream: stream,
  });
  console.log(
    "handle Track event, after add stream" + JSON.stringify(broadcasterStreams)
  );
  sendBroadcasterStreamsUpdate();
}

function sendBroadcasterStreamsUpdate() {
  console.log("sendBroadcasterStreamsUpdate");
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(broadcasterStreams));
    }
  });
}

server.listen(5000, () => console.log("Server started"));
