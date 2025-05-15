import * as mediasoupClient from "mediasoup-client";

let device;
let sendTransport;
let recvTransport;

export async function loadDevice(routerRtpCapabilities) {
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities });
  return device;
}

export function getDevice() {
  return device;
}

export async function createSendTransport(ws, onConnect, onProduce) {
  return new Promise((resolve) => {
    ws.send(JSON.stringify({ type: "create-transport" }));
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transport-created") {
        sendTransport = device.createSendTransport(data.params);

        sendTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            ws.send(
              JSON.stringify({
                type: "connect-transport",
                transportId: sendTransport.id,
                dtlsParameters,
              })
            );
            callback();
            onConnect && onConnect();
          }
        );

        sendTransport.on(
          "produce",
          async ({ kind, rtpParameters }, callback) => {
            ws.send(
              JSON.stringify({
                type: "produce",
                transportId: sendTransport.id,
                kind,
                rtpParameters,
              })
            );
            ws.onmessage = (event) => {
              const res = JSON.parse(event.data);
              if (res.type === "produced") {
                callback({ id: res.id });
                onProduce && onProduce(res.id);
              }
            };
          }
        );

        resolve(sendTransport);
      }
    };
  });
}

export async function createRecvTransport(ws, rtpCapabilities) {
  return new Promise((resolve) => {
    ws.send(JSON.stringify({ type: "create-transport" }));
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transport-created") {
        recvTransport = device.createRecvTransport(data.params);

        recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          ws.send(
            JSON.stringify({
              type: "connect-transport",
              transportId: recvTransport.id,
              dtlsParameters,
            })
          );
          callback();
        });

        resolve(recvTransport);
      }
    };
  });
}

export function getSendTransport() {
  return sendTransport;
}

export function getRecvTransport() {
  return recvTransport;
}
