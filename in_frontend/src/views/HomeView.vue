<template>
  <ElContainer class="home-container">
    <ElHeader class="container-header">
      <div>Home</div>
      <button @click="test1">Test1</button>
      <button @click="test2">Test2</button>
      <CanvasControl />
    </ElHeader>
    <ElMain class="container-main">
      <BlockCanvas ref="blockCanvasRef" />
    </ElMain>
  </ElContainer>
</template>

<script setup>
import BlockCanvas from "@/components/BlockCanvas.vue";
import CanvasControl from "@/components/CanvasControl.vue";
import { ElContainer, ElHeader, ElMain } from "element-plus";
import { computed, ref, provide } from "vue";

const blockCanvasRef = ref(null);
const clearWorkspaceValid = computed(() => {
  return blockCanvasRef.value?.clearWorkspaceValid;
});
const scale = computed(() => {
  return blockCanvasRef.value?.scale ?? 1;
});

provide("blockCanvasRef", blockCanvasRef);
provide("clearWorkspaceValid", clearWorkspaceValid);
provide("scale", scale);

function test1() {
  console.log(blockCanvasRef.value.getPlacedBlockList());
}

function test2() {
  blockCanvasRef.value.safeLoadFromBlockList([
    {
      id: "block_5_1748228674476",
      x: 20,
      y: 20,
      category: "1",
      connections: {
        top: null,
        bottom: null,
        left: null,
        right: "block_6_1748228676137",
      },
    },
    {
      id: "block_6_1748228676137",
      x: 160,
      y: 20,
      category: "4",
      connections: {
        top: null,
        bottom: null,
        left: "block_5_1748228674476",
        right: "block_7_1748228679308",
      },
    },
    {
      id: "block_7_1748228679308",
      x: 300,
      y: 20,
      category: "3",
      connections: {
        top: null,
        bottom: "block_8_1748228840561",
        left: "block_6_1748228676137",
        right: null,
      },
    },
    {
      id: "block_8_1748228840561",
      x: 300,
      y: 120,
      category: "4",
      connections: {
        top: "block_7_1748228679308",
        bottom: null,
        left: null,
        right: null,
      },
    },
  ]);
}
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.container-main {
  position: relative; /* 保持 relative 以便绝对定位的子元素（如toggle button）*/
  overflow: hidden;
  flex: 1;
  padding: 0;
  display: flex; /* 使 home-aside 和 canvas-container 水平排列 */
}
</style>
