<script setup>
import { ref } from 'vue';
import StreamerView from './components/StreamerView.vue';
import ViewerView from './components/ViewerView.vue';

const mode = ref('home'); // 'home' | 'streamer' | 'viewer'
const error = ref('');
const streamId = ref('');
const customRoomId = ref('');

function goHome() {
  mode.value = 'home';
  error.value = '';
  streamId.value = '';
  customRoomId.value = '';
}

function startStream() {
  if (!customRoomId.value) {
    error.value = 'Please enter a room ID';
    return;
  }
  streamId.value = customRoomId.value;
  mode.value = 'streamer';
}

function joinStream() {
  if (!customRoomId.value) {
    error.value = 'Please enter a room ID';
    return;
  }
  streamId.value = customRoomId.value;
  mode.value = 'viewer';
}
</script>

<template>
  <div class="app">
    <h1>🛸 Live Streaming App (mediasoup)</h1>

    <div v-if="mode === 'home'" class="menu">
      <div class="room-input">
        <input 
          v-model="customRoomId"
          type="text"
          placeholder="Enter Room ID"
          class="room-input-field"
        />
      </div>
      <div class="button-group">
        <button class="btn" @click="startStream">Start Streaming</button>
        <button class="btn" @click="joinStream">Join Stream</button>
      </div>
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
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
}
.button-group {
  display: flex;
  gap: 1rem;
}
.room-input {
  width: 100%;
  max-width: 300px;
}
.room-input-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
}
.room-input-field:focus {
  outline: none;
  border-color: #1e88e5;
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
