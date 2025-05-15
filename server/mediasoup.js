const mediasoup = require("mediasoup");

let worker, router;
let transports = new Map();
let producers = new Map();
let consumers = new Map();

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
  },
];

async function startMediasoup() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({ mediaCodecs });

  return { router };
}

function getRouterRtpCapabilities() {
  return router.rtpCapabilities;
}

async function createWebRtcTransport() {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}

module.exports = {
  startMediasoup,
  getRouterRtpCapabilities,
  worker: () => worker,
  router: () => router,
  transports,
  producers,
  consumers,
  createWebRtcTransport,
};
