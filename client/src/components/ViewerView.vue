<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  loadDevice,
  createRecvTransport,
  getDevice
} from '../lib/mediasoupClient';

const props = defineProps({
  streamId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['go-home']);

const videoElement = ref(null);
let ws = null;
let consumerTransport = null;
let mediaStream = null;
let consumers = new Set();

onMounted(async () => {
  await initializeViewer();
});

async function initializeViewer() {
  // Cleanup any existing resources
  await cleanup();

  ws = new WebSocket('ws://localhost:3000/ws');
  console.log('[Viewer] Mounting and opening WebSocket...');

  ws.addEventListener('open', () => {
    console.log('[Viewer] WebSocket connected');
    ws.send(JSON.stringify({ 
      type: 'get-rtp-capabilities',
      roomId: props.streamId 
    }));
  });

  ws.addEventListener('message', async (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'rtp-capabilities') {
      console.log('[Viewer] Got RTP Capabilities');
      await loadDevice(data.rtpCapabilities);

      consumerTransport = await createRecvTransport(ws, getDevice().rtpCapabilities, props.streamId);
      console.log('[Viewer] Recv transport created:', consumerTransport.id);

      ws.send(JSON.stringify({
        type: 'consume',
        transportId: consumerTransport.id,
        rtpCapabilities: getDevice().rtpCapabilities,
        roomId: props.streamId
      }));
    }

    if (data.type === 'consumer-created') {
      console.log('[Viewer] Consumer info:', data);

      const consumer = await consumerTransport.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters
      });

      consumers.add(consumer);

      if (!mediaStream) {
        mediaStream = new MediaStream();
        videoElement.value.srcObject = mediaStream;
      }

      mediaStream.addTrack(consumer.track);

      try {
        await videoElement.value.play();
        console.log('[Viewer] Playing stream...');
      } catch (err) {
        console.error('[Viewer] Error playing stream:', err);
      }
    }

    if (data.type === 'error') {
      console.error('[Viewer] Server error:', data.error);
    }

    if (data.type === 'stream-stopped') {
      alert('The stream was stopped');
      await exitRoom();
    }
  });

  ws.addEventListener('error', (err) => {
    console.error('[Viewer] WebSocket error:', err);
  });

  ws.addEventListener('close', () => {
    console.log('[Viewer] WebSocket closed');
  });
}

async function exitRoom() {
  try {
    await cleanup();
    emit('go-home');
  } catch (err) {
    console.error('[Viewer] Error exiting room:', err);
  }
}

async function cleanup() {
  if (consumers.size > 0) {
    for (const consumer of consumers) {
      try {
        await consumer.close();
      } catch (err) {
        console.error('[Viewer] Error closing consumer:', err);
      }
    }
    consumers.clear();
  }

  if (consumerTransport) {
    try {
      await consumerTransport.close();
    } catch (err) {
      console.error('[Viewer] Error closing transport:', err);
    }
    consumerTransport = null;
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
  <div class="viewer-container">
    <h2>Viewer - Room: {{ streamId }}</h2>
    <video ref="videoElement" autoplay playsinline controls style="width: 100%" />
    <div class="button-group">
      <button class="btn exit-btn" @click="exitRoom">Exit Room</button>
    </div>
  </div>
</template>

<style scoped>
.viewer-container {
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

.exit-btn {
  background-color: #6c757d;
  color: white;
}

.exit-btn:hover {
  background-color: #5a6268;
}
</style>
