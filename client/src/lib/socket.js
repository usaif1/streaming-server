export function createSocket(url) {
  const socket = new WebSocket(url);
  const listeners = new Map();

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const type = msg.type;
    if (listeners.has(type)) listeners.get(type)(msg);
  };

  function on(type, handler) {
    listeners.set(type, handler);
  }

  function send(type, payload = {}) {
    socket.send(JSON.stringify({ type, ...payload }));
  }

  return { socket, on, send };
}
