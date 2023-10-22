const ws = new WebSocket("ws://localhost:5000");
const consumerConnections = new Map(); // Store consumer connections, indexed by broadcaster identifier

async function init() {
  console.log("init");
  ws.onmessage = (event) => {
    console.log("FROM VIEWER: " + event.data);
    const broadcasterStreamsData = JSON.parse(event.data);

    broadcasterStreamsData.forEach((broadcasterStreamData) => {
      const broadcasterId = broadcasterStreamData.id;
      const stream = broadcasterStreamData.stream;
      console.log(
        "either true or false" +
          !consumerConnections.has(broadcasterId) +
          " " +
          broadcasterId
      );
      if (!consumerConnections.has(broadcasterId)) {
        const broadcasterPeer = createPeer();
        console.log("called createpeer in viewer");
        broadcasterPeer.addTransceiver("video", { direction: "recvonly" });
        consumerConnections.set(broadcasterId, broadcasterPeer);
      }
    });
  };
}

function createPeer() {
  const peer = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  });
  //peer.broadcasterId = broadcasterId; // Store the broadcaster identifier
  peer.ontrack = handleTrackEvent;
  console.log("called handleTrackEvent in viewer");
  peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);
  console.log("called handleNegotiationNeededEvent in viewer");

  return peer;
}

async function handleNegotiationNeededEvent(peer) {
  const offer = await peer.createOffer();
  console.log("offer is");
  console.log(offer);
  await peer.setLocalDescription(offer);
  const payload = {
    sdp: peer.localDescription,
  };

  const { data } = await axios.post("/consumer", payload);
  const desc = new RTCSessionDescription(data.sdp);
  console.log("desc is");
  console.log(desc);
  peer
    .setRemoteDescription(desc)
    .catch((e) =>
      console.log("called from inside handleNegotiationNeededEvent " + e)
    );
}

function handleTrackEvent(e) {
  console.log(e.streams[0]);
  // Create a new video element for each stream and append it to the container
  const videoElement = document.createElement("video");
  videoElement.srcObject = e.streams[0];
  const videoContainer = document.getElementById("video-container");
  videoContainer.appendChild(videoElement);
}

init();
