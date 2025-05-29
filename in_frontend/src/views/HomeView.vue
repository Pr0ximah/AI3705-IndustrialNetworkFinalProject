<template>
  <ElContainer class="home-container cannot-select">
    <ElHeader class="container-header">
      <div style="display: flex; gap: 10px">
        <div>Home</div>
        <button @click="test1">Test1</button>
        <button @click="test2">Test2</button>
        <button @click="test3">Test3</button>
      </div>
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
import service from "@/util/ajax_inst";

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

let workspace = {
  version: "1.0",
  timestamp: 1748510669163,
  canvas: {
    scale: 1,
    offsetX: 321.5,
    offsetY: 246.5,
  },
  blockCategories: [
    {
      name: "传送带",
      description: "传输货物",
      signal_input: [
        {
          name: "start",
          description: "开始传输",
        },
      ],
      signal_output: [
        {
          name: "stop",
          description: "停止传输",
        },
      ],
      var_input: [
        {
          name: "poweron",
          type: "bool",
          description: "是否启用",
        },
      ],
      var_output: [
        {
          name: "poweroff",
          type: "bool",
          description: "是否关闭",
        },
      ],
    },
  ],
  blocks: [
    {
      id: "block_2_1748510045368",
      x: -243.5,
      y: -190.5,
      width: 100,
      height: 100,
      categoryName: "传送带",
      categoryIndex: 0,
      categoryConf: {
        name: "传送带",
        signal_input: [
          {
            name: "start",
            description: "开始传输",
          },
        ],
        signal_output: [
          {
            name: "stop",
            description: "停止传输",
          },
        ],
        var_input: [
          {
            name: "poweron",
            type: "bool",
            description: "是否启用",
          },
        ],
        var_output: [
          {
            name: "poweroff",
            type: "bool",
            description: "是否关闭",
          },
        ],
        description: "传输货物",
      },
    },
    {
      id: "block_3_1748510045909",
      x: 67.5,
      y: -177.5,
      width: 100,
      height: 100,
      categoryName: "传送带",
      categoryIndex: 0,
      categoryConf: {
        name: "传送带",
        signal_input: [
          {
            name: "start",
            description: "开始传输",
          },
        ],
        signal_output: [
          {
            name: "stop",
            description: "停止传输",
          },
        ],
        var_input: [
          {
            name: "poweron",
            type: "bool",
            description: "是否启用",
          },
        ],
        var_output: [
          {
            name: "poweroff",
            type: "bool",
            description: "是否关闭",
          },
        ],
        description: "传输货物",
      },
    },
    {
      id: "block_5_1748510641128",
      x: -262.5,
      y: -16.5,
      width: 100,
      height: 100,
      categoryName: "传送带",
      categoryIndex: 0,
      categoryConf: {
        name: "传送带",
        signal_input: [
          {
            name: "start",
            description: "开始传输",
          },
        ],
        signal_output: [
          {
            name: "stop",
            description: "停止传输",
          },
        ],
        var_input: [
          {
            name: "poweron",
            type: "bool",
            description: "是否启用",
          },
        ],
        var_output: [
          {
            name: "poweroff",
            type: "bool",
            description: "是否关闭",
          },
        ],
        description: "传输货物",
      },
    },
    {
      id: "block_6_1748510641712",
      x: -48.5,
      y: -48.5,
      width: 100,
      height: 100,
      categoryName: "传送带",
      categoryIndex: 0,
      categoryConf: {
        name: "传送带",
        signal_input: [
          {
            name: "start",
            description: "开始传输",
          },
        ],
        signal_output: [
          {
            name: "stop",
            description: "停止传输",
          },
        ],
        var_input: [
          {
            name: "poweron",
            type: "bool",
            description: "是否启用",
          },
        ],
        var_output: [
          {
            name: "poweroff",
            type: "bool",
            description: "是否关闭",
          },
        ],
        description: "传输货物",
      },
    },
    {
      id: "block_7_1748510642358",
      x: -114.5,
      y: 75.5,
      width: 100,
      height: 100,
      categoryName: "传送带",
      categoryIndex: 0,
      categoryConf: {
        name: "传送带",
        signal_input: [
          {
            name: "start",
            description: "开始传输",
          },
        ],
        signal_output: [
          {
            name: "stop",
            description: "停止传输",
          },
        ],
        var_input: [
          {
            name: "poweron",
            type: "bool",
            description: "是否启用",
          },
        ],
        var_output: [
          {
            name: "poweroff",
            type: "bool",
            description: "是否关闭",
          },
        ],
        description: "传输货物",
      },
    },
    {
      id: "block_8_1748510662129",
      x: 109.5,
      y: 23.5,
      width: 100,
      height: 100,
      categoryName: "传送带",
      categoryIndex: 0,
      categoryConf: {
        name: "传送带",
        signal_input: [
          {
            name: "start",
            description: "开始传输",
          },
        ],
        signal_output: [
          {
            name: "stop",
            description: "停止传输",
          },
        ],
        var_input: [
          {
            name: "poweron",
            type: "bool",
            description: "是否启用",
          },
        ],
        var_output: [
          {
            name: "poweroff",
            type: "bool",
            description: "是否关闭",
          },
        ],
        description: "传输货物",
      },
    },
  ],
  connections: [
    {
      id: "connection_1",
      type: "signal",
      start: {
        blockId: "block_2_1748510045368",
        type: "signal_output",
        index: 0,
      },
      end: {
        blockId: "block_3_1748510045909",
        type: "signal_input",
        index: 0,
      },
    },
    {
      id: "connection_2",
      type: "var",
      start: {
        blockId: "block_2_1748510045368",
        type: "var_output",
        index: 0,
      },
      end: {
        blockId: "block_3_1748510045909",
        type: "var_input",
        index: 0,
      },
    },
    {
      id: "connection_3",
      type: "signal",
      start: {
        blockId: "block_3_1748510045909",
        type: "signal_output",
        index: 0,
      },
      end: {
        blockId: "block_5_1748510641128",
        type: "signal_input",
        index: 0,
      },
    },
    {
      id: "connection_4",
      type: "signal",
      start: {
        blockId: "block_5_1748510641128",
        type: "signal_output",
        index: 0,
      },
      end: {
        blockId: "block_6_1748510641712",
        type: "signal_input",
        index: 0,
      },
    },
    {
      id: "connection_5",
      type: "signal",
      start: {
        blockId: "block_6_1748510641712",
        type: "signal_output",
        index: 0,
      },
      end: {
        blockId: "block_7_1748510642358",
        type: "signal_input",
        index: 0,
      },
    },
    {
      id: "connection_6",
      type: "var",
      start: {
        blockId: "block_3_1748510045909",
        type: "var_output",
        index: 0,
      },
      end: {
        blockId: "block_6_1748510641712",
        type: "var_input",
        index: 0,
      },
    },
    {
      id: "connection_7",
      type: "var",
      start: {
        blockId: "block_6_1748510641712",
        type: "var_output",
        index: 0,
      },
      end: {
        blockId: "block_7_1748510642358",
        type: "var_input",
        index: 0,
      },
    },
    {
      id: "connection_8",
      type: "var",
      start: {
        blockId: "block_7_1748510642358",
        type: "var_output",
        index: 0,
      },
      end: {
        blockId: "block_5_1748510641128",
        type: "var_input",
        index: 0,
      },
    },
    {
      id: "connection_9",
      type: "var",
      start: {
        blockId: "block_5_1748510641128",
        type: "var_output",
        index: 0,
      },
      end: {
        blockId: "block_8_1748510662129",
        type: "var_input",
        index: 0,
      },
    },
    {
      id: "connection_10",
      type: "signal",
      start: {
        blockId: "block_7_1748510642358",
        type: "signal_output",
        index: 0,
      },
      end: {
        blockId: "block_8_1748510662129",
        type: "signal_input",
        index: 0,
      },
    },
  ],
};
function test1() {
  console.log(blockCanvasRef.value.getWorkspace());
}

function test2() {
  blockCanvasRef.value.loadWorkspace(workspace);
}

function test3() {
  service
    .get("/")
    .then((response) => {
      console.log("Response from server:", response);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    })
    .finally(() => {
      console.log("Request completed");
    });
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
