const {
  getRouterRtpCapabilities,
  createWebRtcTransport,
  transports,
  producers,
  consumers,
  router: getRouter, // ✅ router accessor
} = require("./mediasoup");

module.exports = function registerSignalingHandlers(ws) {
  ws.on("message", async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("[Signaling] Failed to parse message:", e);
      return;
    }

    switch (data.type) {
      case "get-rtp-capabilities": {
        const rtpCapabilities = getRouterRtpCapabilities();
        ws.send(
          JSON.stringify({
            type: "rtp-capabilities",
            rtpCapabilities,
          })
        );
        break;
      }

      case "create-transport": {
        const { transport, params } = await createWebRtcTransport();
        transports.set(params.id, transport);
        ws.send(
          JSON.stringify({
            type: "transport-created",
            params,
          })
        );
        break;
      }

      case "connect-transport": {
        const transport = transports.get(data.transportId);
        if (!transport)
          return console.warn(
            "[Signaling] Transport not found:",
            data.transportId
          );
        await transport.connect({ dtlsParameters: data.dtlsParameters });
        break;
      }

      case "produce": {
        const transport = transports.get(data.transportId);
        if (!transport)
          return console.warn("[Signaling] Transport not found for produce");
        const producer = await transport.produce({
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });
        producers.set(producer.id, producer);
        ws.send(
          JSON.stringify({
            type: "produced",
            id: producer.id,
          })
        );
        break;
      }

      case "consume": {
        const transport = transports.get(data.transportId);
        const router = getRouter();
        if (!transport || !router)
          return console.warn("[Signaling] Invalid transport or router");

        for (const producer of producers.values()) {
          if (
            !router.canConsume({
              producerId: producer.id,
              rtpCapabilities: data.rtpCapabilities,
            })
          ) {
            console.warn(`[Signaling] Cannot consume producer ${producer.id}`);
            continue;
          }

          const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities: data.rtpCapabilities,
            paused: false,
          });

          consumers.set(consumer.id, consumer);

          ws.send(
            JSON.stringify({
              type: "consumer-created",
              id: consumer.id,
              producerId: producer.id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            })
          );
        }
        break;
      }

      default:
        console.warn("[Signaling] Unknown message type:", data.type);
    }
  });
};
