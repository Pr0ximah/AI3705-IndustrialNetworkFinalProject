<template>
  <div class="window-controls">
    <div class="control-button no-drag" @click="minimizeWindow">
      <svg
        t="1748533267833"
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="1456"
        width="17"
        height="17"
      >
        <path
          d="M112 484v56c0 8.8 7.2 16 16 16h768c8.8 0 16-7.2 16-16v-56c0-8.8-7.2-16-16-16H128c-8.8 0-16 7.2-16 16z"
          p-id="1457"
        ></path>
      </svg>
    </div>
    <div class="control-button no-drag" @click="toggleMaximizeWindow">
      <svg
        t="1748533321715"
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="2484"
        width="18"
        height="18"
      >
        <path
          d="M233.301333 128A105.301333 105.301333 0 0 0 128 233.301333v557.397334A105.301333 105.301333 0 0 0 233.301333 896h557.397334A105.301333 105.301333 0 0 0 896 790.698667V233.301333A105.301333 105.301333 0 0 0 790.698667 128H233.301333z m-18.602666 105.301333c0-10.24 8.32-18.602667 18.602666-18.602666h557.397334c10.24 0 18.602667 8.32 18.602666 18.602666v557.397334c0 10.24-8.32 18.602667-18.602666 18.602666H233.301333a18.56 18.56 0 0 1-18.602666-18.602666V233.301333z"
          p-id="2485"
        ></path>
      </svg>
    </div>
    <div class="control-button no-drag close" @click="closeWindow">
      <svg
        t="1748533350804"
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="3591"
        width="16"
        height="16"
      >
        <path
          d="M585.28 517.376l339.392-339.392a48.32 48.32 0 0 0 0-67.84 47.872 47.872 0 0 0-67.84 0L517.312 449.536 177.984 110.08a48.32 48.32 0 0 0-67.84 0 47.872 47.872 0 0 0 0 67.84l339.392 339.392-339.392 339.392a48.32 48.32 0 0 0 0 67.904 47.872 47.872 0 0 0 67.84 0l339.392-339.392 339.392 339.392a48.32 48.32 0 0 0 67.904 0 47.872 47.872 0 0 0 0-67.84L585.28 517.312z"
          fill="#030303"
          p-id="3592"
        ></path>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { inject } from "vue";

function minimizeWindow() {
  window.ipcApi.send("minimize-window");
}

function toggleMaximizeWindow() {
  window.ipcApi.send("toggle-maximize-window");
}

function closeWindow() {
  window.ipcApi.send("close-window");
}
</script>
