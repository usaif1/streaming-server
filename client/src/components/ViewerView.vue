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

const videoElement = ref(null);
let ws = null;
let consumerTransport;
let mediaStream;

onMounted(async () => {
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
  });

  ws.addEventListener('error', (err) => {
    console.error('[Viewer] WebSocket error:', err);
  });

  ws.addEventListener('close', () => {
    console.log('[Viewer] WebSocket closed');
  });
});

onBeforeUnmount(() => {
  if (ws) {
    ws.close();
    ws = null;
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
});
</script>

<template>
  <div>
    <h2>Viewer - Room: {{ streamId }}</h2>
    <video ref="videoElement" autoplay playsinline controls style="width: 100%" />
  </div>
</template>

<style scoped>
video {
  border-radius: 10px;
  border: 2px solid #ccc;
}
</style>
