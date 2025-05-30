<template>
  <ElContainer class="home-container cannot-select">
    <ElHeader class="container-header drag">
      <div style="display: flex; gap: 10px; margin-left: 20px">
        <div>Home</div>
        <button @click="test1">Test1</button>
        <button @click="test2">Test2</button>
        <button @click="test3">Test3</button>
      </div>
      <div
        style="
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 10px;
        "
      >
        <CanvasControl />
        <WindowControl />
      </div>
    </ElHeader>
    <ElMain class="container-main">
      <BlockCanvas ref="blockCanvasRef" />
    </ElMain>
  </ElContainer>
</template>

<script setup>
import BlockCanvas from "@/components/BlockCanvas.vue";
import CanvasControl from "@/components/CanvasControl.vue";
import WindowControl from "@/components/WindowControl.vue";
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

let workspace = {
  version: "1.0",
  timestamp: 1748591683970,
  canvas: {
    scale: 1,
    offsetX: 468.5,
    offsetY: 373.5,
  },
  blockCategories: [
    {
      name: "输送机",
      signal_input: [
        {
          name: "StartCmd",
          description: "启动命令信号",
        },
        {
          name: "StopCmd",
          description: "急停命令信号",
        },
        {
          name: "MaterialDetected",
          description: "物料到位传感器信号",
        },
      ],
      signal_output: [
        {
          name: "MotorRun",
          description: "电机运行控制信号",
        },
        {
          name: "MaterialPresent",
          description: "物料存在状态信号",
        },
      ],
      var_input: [
        {
          name: "MaterialPosition",
          type: "bool",
          description: "物料位置检测信号，TRUE表示物料到位",
        },
        {
          name: "SpeedReference",
          type: "float",
          description: "输送机速度设定值(0-100%)",
        },
      ],
      var_output: [
        {
          name: "MotorSpeed",
          type: "float",
          description: "电机实际运行速度反馈",
        },
        {
          name: "FaultStatus",
          type: "int",
          description: "故障状态码，0表示正常",
        },
      ],
    },
    {
      name: "提升机",
      signal_input: [
        {
          name: "StartLift",
          description: "启动提升信号",
        },
        {
          name: "EmergencyStop",
          description: "急停信号",
        },
        {
          name: "PositionReached",
          description: "位置到达信号",
        },
      ],
      signal_output: [
        {
          name: "LiftRunning",
          description: "提升机运行中信号",
        },
        {
          name: "OverloadAlarm",
          description: "超载报警信号",
        },
        {
          name: "TargetReached",
          description: "目标位置到达信号",
        },
      ],
      var_input: [
        {
          name: "CurrentPosition",
          type: "float",
          description: "当前提升机位置(米)",
        },
        {
          name: "TargetPosition",
          type: "float",
          description: "目标提升位置(米)",
        },
        {
          name: "LoadWeight",
          type: "float",
          description: "当前负载重量(kg)",
        },
      ],
      var_output: [
        {
          name: "MotorSpeed",
          type: "float",
          description: "电机运行速度(RPM)",
        },
        {
          name: "PositionError",
          type: "float",
          description: "位置误差(米)",
        },
      ],
    },
    {
      name: "移栽机",
      signal_input: [
        {
          name: "StartTransfer",
          description: "启动移栽信号",
        },
        {
          name: "EmergencyStop",
          description: "急停信号",
        },
        {
          name: "WorkpieceDetected",
          description: "工件到位检测信号",
        },
      ],
      signal_output: [
        {
          name: "TransferComplete",
          description: "移栽完成信号",
        },
        {
          name: "Alarm",
          description: "异常报警信号",
        },
      ],
      var_input: [
        {
          name: "CurrentPosition",
          type: "float",
          description: "当前移栽臂位置坐标(mm)",
        },
        {
          name: "TargetPosition",
          type: "float",
          description: "目标移栽位置坐标(mm)",
        },
        {
          name: "WorkpieceWeight",
          type: "float",
          description: "工件重量(kg)",
        },
      ],
      var_output: [
        {
          name: "MoveSpeed",
          type: "float",
          description: "移栽臂移动速度(mm/s)",
        },
        {
          name: "GripperForce",
          type: "float",
          description: "夹爪夹持力(N)",
        },
      ],
    },
  ],
  blocks: [
    {
      id: "block_8_1748591671475",
      x: -389.5,
      y: -284.5,
      width: 200,
      height: 200,
      categoryName: "输送机",
      categoryIndex: 0,
      categoryConf: {
        name: "输送机",
        signal_input: [
          {
            name: "StartCmd",
            description: "启动命令信号",
          },
          {
            name: "StopCmd",
            description: "急停命令信号",
          },
          {
            name: "MaterialDetected",
            description: "物料到位传感器信号",
          },
        ],
        signal_output: [
          {
            name: "MotorRun",
            description: "电机运行控制信号",
          },
          {
            name: "MaterialPresent",
            description: "物料存在状态信号",
          },
        ],
        var_input: [
          {
            name: "MaterialPosition",
            type: "bool",
            description: "物料位置检测信号，TRUE表示物料到位",
          },
          {
            name: "SpeedReference",
            type: "float",
            description: "输送机速度设定值(0-100%)",
          },
        ],
        var_output: [
          {
            name: "MotorSpeed",
            type: "float",
            description: "电机实际运行速度反馈",
          },
          {
            name: "FaultStatus",
            type: "int",
            description: "故障状态码，0表示正常",
          },
        ],
      },
    },
    {
      id: "block_10_1748591674170",
      x: 25.5,
      y: -216.5,
      width: 200,
      height: 200,
      categoryName: "提升机",
      categoryIndex: 1,
      categoryConf: {
        name: "提升机",
        signal_input: [
          {
            name: "StartLift",
            description: "启动提升信号",
          },
          {
            name: "EmergencyStop",
            description: "急停信号",
          },
          {
            name: "PositionReached",
            description: "位置到达信号",
          },
        ],
        signal_output: [
          {
            name: "LiftRunning",
            description: "提升机运行中信号",
          },
          {
            name: "OverloadAlarm",
            description: "超载报警信号",
          },
          {
            name: "TargetReached",
            description: "目标位置到达信号",
          },
        ],
        var_input: [
          {
            name: "CurrentPosition",
            type: "float",
            description: "当前提升机位置(米)",
          },
          {
            name: "TargetPosition",
            type: "float",
            description: "目标提升位置(米)",
          },
          {
            name: "LoadWeight",
            type: "float",
            description: "当前负载重量(kg)",
          },
        ],
        var_output: [
          {
            name: "MotorSpeed",
            type: "float",
            description: "电机运行速度(RPM)",
          },
          {
            name: "PositionError",
            type: "float",
            description: "位置误差(米)",
          },
        ],
      },
    },
  ],
  connections: [
    {
      id: "connection_1",
      type: "signal",
      start: {
        blockId: "block_8_1748591671475",
        type: "signal_output",
        index: 0,
      },
      end: {
        blockId: "block_10_1748591674170",
        type: "signal_input",
        index: 0,
      },
    },
    {
      id: "connection_2",
      type: "var",
      start: {
        blockId: "block_8_1748591671475",
        type: "var_output",
        index: 0,
      },
      end: {
        blockId: "block_10_1748591674170",
        type: "var_input",
        index: 0,
      },
    },
    {
      id: "connection_3",
      type: "var",
      start: {
        blockId: "block_8_1748591671475",
        type: "var_output",
        index: 1,
      },
      end: {
        blockId: "block_10_1748591674170",
        type: "var_input",
        index: 1,
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
  blockCanvasRef.value.saveBlockCatetoriesToFile();
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
