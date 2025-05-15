<script setup>
import { ref } from 'vue';
import StreamerView from './components/StreamerView.vue';
import ViewerView from './components/ViewerView.vue';

const mode = ref('home'); // 'home' | 'streamer' | 'viewer'
const error = ref('');
const streamId = ref(Date.now().toString());

function goHome() {
  mode.value = 'home';
  error.value = '';
}

function startStream() {
  streamId.value = Date.now().toString();
  mode.value = 'streamer';
}

function joinStream() {
  mode.value = 'viewer';
}
</script>

<template>
  <div class="app">
    <h1>🛸 Live Streaming App (mediasoup)</h1>

    <div v-if="mode === 'home'" class="menu">
      <button class="btn" @click="startStream">Start Streaming</button>
      <button class="btn" @click="joinStream">Join Stream</button>
    </div>

    <StreamerView
      v-if="mode === 'streamer'"
      :stream-id="streamId"
      @go-home="goHome"
    />

    <ViewerView
      v-if="mode === 'viewer'"
      :stream-id="streamId"
      @go-home="goHome"
      @error="(e) => error = e"
    />

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<style scoped>
.app {
  max-width: 720px;
  margin: 2rem auto;
  text-align: center;
  font-family: Arial, sans-serif;
}
.menu {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}
.btn {
  padding: 0.75rem 1.5rem;
  background-color: #1e88e5;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}
.btn:hover {
  background-color: #1565c0;
}
.error {
  margin-top: 2rem;
  color: red;
}
</style>
