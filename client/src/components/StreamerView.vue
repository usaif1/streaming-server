<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  loadDevice,
  createSendTransport,
  getDevice
} from '../lib/mediasoupClient';

const props = defineProps({
  streamId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['go-home', 'stream-stopped']);

const videoElement = ref(null);
let ws = null;
let sendTransport = null;
let producers = new Set();
let mediaStream = null;

onMounted(async () => {
  await initializeStreamer();
});

async function initializeStreamer() {
  // Cleanup any existing resources
  await cleanup();

  console.log('StreamerView mounted', location.host);

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoElement.value.srcObject = mediaStream;

    ws = new WebSocket(`ws://localhost:3000/ws`);

    ws.addEventListener('open', () => {
      console.log('[Streamer] WebSocket connected');
      ws.send(JSON.stringify({ 
        type: 'get-rtp-capabilities',
        roomId: props.streamId 
      }));
    });

    ws.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'rtp-capabilities') {
        console.log('[Streamer] Received RTP Capabilities');
        await loadDevice(data.rtpCapabilities);

        sendTransport = await createSendTransport(ws, () => {
          console.log('[Streamer] Send Transport Connected');
        }, (producerId) => {
          console.log('[Streamer] Track Produced, id:', producerId);
        }, props.streamId);

        console.log('[Streamer] Creating Producers...');
        for (const track of mediaStream.getTracks()) {
          const kind = track.kind;
          const producer = await sendTransport.produce({ track });
          producers.add(producer);
          console.log(`[Streamer] Produced ${kind}: ${producer.id}`);
        }
      }
    });

    ws.addEventListener('error', (err) => {
      console.error('[Streamer] WebSocket error:', err);
    });

    ws.addEventListener('close', () => {
      console.log('[Streamer] WebSocket closed');
    });
  } catch (err) {
    console.error('[Streamer] Error initializing:', err);
  }
}

async function stopStream() {
  try {
    // Notify server to close the room
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'close-room',
        roomId: props.streamId
      }));
    }
    
    await cleanup();
    emit('stream-stopped');
    emit('go-home');
  } catch (err) {
    console.error('[Streamer] Error stopping stream:', err);
  }
}

async function cleanup() {
  if (producers.size > 0) {
    for (const producer of producers) {
      try {
        await producer.close();
      } catch (err) {
        console.error('[Streamer] Error closing producer:', err);
      }
    }
    producers.clear();
  }

  if (sendTransport) {
    try {
      await sendTransport.close();
    } catch (err) {
      console.error('[Streamer] Error closing transport:', err);
    }
    sendTransport = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }
}

onBeforeUnmount(async () => {
  await cleanup();
});
</script>

<template>
  <div class="streamer-container">
    <h2>Streamer - Room: {{ streamId }}</h2>
    <video ref="videoElement" autoplay muted playsinline style="width: 100%" />
    <div class="button-group">
      <button class="btn stop-btn" @click="stopStream">Stop Stream</button>
    </div>
  </div>
</template>

<style scoped>
.streamer-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

video {
  border-radius: 10px;
  border: 2px solid #ccc;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.stop-btn {
  background-color: #dc3545;
  color: white;
}

.stop-btn:hover {
  background-color: #c82333;
}
</style>
