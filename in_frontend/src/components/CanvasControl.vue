<template>
  <div class="canvas-controls">
    <button @click="resetCanvas">
      <FullScreen class="icon" />
    </button>
    <button @click="zoomIn">
      <Plus class="icon" />
    </button>
    <button @click="zoomOut">
      <Minus class="icon" />
    </button>
    <button
      :class="[clearWorkspaceValid ? 'valid' : 'invalid']"
      @click="clearWorkspace"
      class="clear-btn"
    >
      清空工作区
      <Delete class="icon" />
    </button>
    <span style="font-size: 15px; padding: 0 10px"
      >缩放: {{ Math.round(scale * 100) }}%</span
    >
  </div>
</template>

<script setup>
import { inject } from "vue";
import { Delete, Plus, Minus, FullScreen } from "@element-plus/icons-vue";

// 注入 HomeView 提供的 ref/computed
const blockCanvasRef = inject("blockCanvasRef");
const clearWorkspaceValid = inject("clearWorkspaceValid");
const scale = inject("scale");

// 本地包装方法，避免模板里写 .value
function resetCanvas() {
  blockCanvasRef.value?.resetCanvas();
}
function zoomIn() {
  blockCanvasRef.value?.zoomIn();
}
function zoomOut() {
  blockCanvasRef.value?.zoomOut();
}
function clearWorkspace() {
  blockCanvasRef.value?.clearWorkspace();
}
</script>
