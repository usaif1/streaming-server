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

const videoElement = ref(null);
let ws = null;

onMounted(async () => {
  console.log('StreamerView mounted', location.host);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  videoElement.value.srcObject = stream;

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

      const transport = await createSendTransport(ws, () => {
        console.log('[Streamer] Send Transport Connected');
      }, (producerId) => {
        console.log('[Streamer] Track Produced, id:', producerId);
      }, props.streamId);

      console.log('[Streamer] Creating Producers...');
      for (const track of stream.getTracks()) {
        const kind = track.kind;
        const producer = await transport.produce({ track });
        console.log(`[Streamer] Produced ${kind}: ${producer.id}`);
      }
    }
  });
});

onBeforeUnmount(() => {
  if (ws) {
    ws.close();
    ws = null;
  }
});
</script>

<template>
  <div>
    <h2>Streamer - Room: {{ streamId }}</h2>
    <video ref="videoElement" autoplay muted playsinline style="width: 100%" />
  </div>
</template>

<style scoped>
video {
  border-radius: 10px;
  border: 2px solid #ccc;
}
</style>
