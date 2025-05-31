<template>
  <div class="main custom-scrollbar">
    <div class="title">创建新项目</div>
    <div class="input-item">
      <div class="label">项目名称</div>
      <ElInput
        v-model="projectName"
        placeholder="请输入项目名称"
        class="input"
        @keydown="handleKeyDown"
      />
    </div>
    <div class="tips">
      <ElIcon size="14" style="margin-right: 8px"><Files /></ElIcon>
      <div>
        你的项目将会储存在 {{ projectPath + "/" + projectName }} 文件夹下
      </div>
    </div>
    <div class="input-item">
      <div class="label">项目功能简述</div>
      <ElInput
        v-model="projectDescription"
        type="textarea"
        placeholder="请简要描述项目功能和目标"
        class="input textarea"
        style="height: auto"
        :rows="4"
        @keydown="handleKeyDown"
      />
    </div>
    <div class="input-item">
      <div class="label">所需功能块</div>
      <ElCollapse v-model="activeBlocks" class="collapse">
        <ElCollapseItem
          v-for="(item, index) in blocks"
          :title="item.name"
          :key="index"
          :name="`block-${index}`"
        >
          <template #title>
            <div class="collapse-title-wrapper">
              <button
                @click.stop="deleteItem(index)"
                class="delete-btn custom-button"
                :class="{ clicked: deleteButtonClickedMap[index] }"
              >
                <div
                  v-if="deleteButtonClickedMap[index]"
                  class="delete-btn-text"
                >
                  删除
                </div>
                <ElIcon v-else size="15"><Close /></ElIcon>
              </button>
              <span
                @click="unsetDeleteButtonClicked('signal_input', index)"
                class="collapse-title"
                >{{ item.name }}</span
              >
            </div>
          </template>

          <div class="feature-item">
            <span>名称</span>
            <ElInput
              v-model="item.name"
              class="collapse-input"
              placeholder="请输入功能块名称"
              @keydown="handleKeyDown"
            ></ElInput>
          </div>
          <div class="feature-item">
            <span>描述</span>
            <ElInput
              v-model="item.description"
              type="textarea"
              class="collapse-input textarea"
              :rows="3"
              placeholder="请输入功能块的详细描述"
              @keydown="handleKeyDown"
            ></ElInput>
          </div>
        </ElCollapseItem>
        <button class="add-btn custom-button" @click="addItem">添加</button>
      </ElCollapse>
    </div>
    <div class="create-btn-wrapper">
      <button class="custom-button create-btn" @click="createProject">
        创建项目
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  ElCollapse,
  ElIcon,
  ElInput,
  ElCollapseItem,
  ElNotification,
  ElLoading,
} from "element-plus";
import { Files, Close } from "@element-plus/icons-vue";
import { defineProps, ref, defineEmits } from "vue";
import service from "@/util/ajax_inst";
const props = defineProps({
  projectPath: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["createProject"]);

const projectName = ref("");
const projectDescription = ref("");
const activeBlocks = ref([]);
const deleteButtonClickedMap = ref([]);
const blocks = ref([]);
const blockConfOrigin = {
  name: "",
  description: "",
};

// 处理键盘事件，确保删除键正常工作
function handleKeyDown(event) {
  // 如果是删除键或退格键
  if (event.key === "Delete" || event.key === "Backspace") {
    // 确保事件不被阻止
    event.stopPropagation();
  }
}

function deleteItem(index) {
  if (deleteButtonClickedMap.value[index]) {
    // 如果按钮已经被点击，执行删除操作
    blocks.value.splice(index, 1);
    deleteButtonClickedMap.value.splice(index, 1);

    // 重新编号剩余块的名称
    activeBlocks.value = activeBlocks.value
      .filter((item) => !item.startsWith(`block-${index}`))
      .map((item) => {
        const blockNum = parseInt(item.split("-")[1]);
        return blockNum > index ? `block-${blockNum - 1}` : item;
      });
  } else {
    // 首次点击，仅将按钮状态设为 true
    deleteButtonClickedMap.value[index] = true;

    // 3秒后自动重置按钮状态
    setTimeout(() => {
      if (deleteButtonClickedMap.value[index]) {
        deleteButtonClickedMap.value[index] = false;
      }
    }, 3000);
  }
}

function addItem() {
  const newBlock = { ...blockConfOrigin };
  blocks.value.push(newBlock);
  deleteButtonClickedMap.value.push(false);
  activeBlocks.value.push(`block-${blocks.value.length - 1}`);
}

function unsetDeleteButtonClicked(index) {
  deleteButtonClickedMap.value[index] = false;
}

async function createProject() {
  if (!projectName.value.trim()) {
    ElNotification({
      title: "错误",
      showClose: false,
      message: "项目名称不能为空",
      type: "warning",
      duration: 3000,
    });
    return;
  }
  if (blocks.value.length === 0) {
    ElNotification({
      title: "错误",
      showClose: false,
      message: "请至少添加一个功能块",
      type: "warning",
      duration: 3000,
    });
    return;
  }

  const projectData = {
    name: projectName.value,
    description: projectDescription.value,
    blocks: blocks.value,
  };

  // 创建加载界面
  const loading = ElLoading.service({
    lock: true,
    customClass: "default-loading",
    text: "正在创建项目...",
    background: "rgba(255, 255, 255, 0.7)",
  });

  try {
    // 创建项目目录
    await window.ipcApi.createProjectDir(props.projectPath, projectName.value);

    // 创建项目
    const data = await service.post("/inputs/create_project", {
      conf: JSON.stringify(projectData),
    });

    // TODO DEBUG delete this
    const test_categories = [
      {
        name: "输送机",
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
        InternalVars: [
          {
            name: "IsRunning",
            type: "bool",
            InitalVaule: "FALSE",
            description: "输送机运行状态标志",
          },
          {
            name: "RunTimer",
            type: "Time",
            InitalVaule: "T#0s",
            description: "运行时间累计",
          },
        ],
        ECC: {
          ECStates: [
            {
              name: "Idle",
              comment: "待机状态",
              x: 50,
              y: 50,
            },
            {
              name: "Accelerating",
              comment: "加速阶段",
              x: 200,
              y: 50,
              ecAction: {
                algorithm: "RampUp",
                output: "MotorRun",
              },
            },
            {
              name: "Running",
              comment: "正常运行",
              x: 350,
              y: 50,
              ecAction: {
                algorithm: "RunConveyor",
                output: "MotorRun",
              },
            },
            {
              name: "Decelerating",
              comment: "减速停止",
              x: 200,
              y: 150,
              ecAction: {
                algorithm: "RampDown",
                output: "MotorRun",
              },
            },
            {
              name: "EmergencyStop",
              comment: "急停状态",
              x: 350,
              y: 150,
              ecAction: {
                algorithm: "EmergencyStop",
                output: "MotorRun",
              },
            },
          ],
          ECTransitions: [
            {
              source: "Idle",
              destination: "Accelerating",
              condition: "StartCmd AND NOT MaterialDetected",
              comment: "收到启动命令且无物料",
              x: 125,
              y: 30,
            },
            {
              source: "Accelerating",
              destination: "Running",
              condition: "MotorSpeed >= SpeedReference",
              comment: "达到设定速度",
              x: 275,
              y: 30,
            },
            {
              source: "Running",
              destination: "Decelerating",
              condition: "StopCmd OR MaterialDetected",
              comment: "收到停止信号或检测到物料",
              x: 350,
              y: 100,
            },
            {
              source: "Decelerating",
              destination: "Idle",
              condition: "MotorSpeed <= 0",
              comment: "完全停止",
              x: 275,
              y: 150,
            },
            {
              source: "Running",
              destination: "EmergencyStop",
              condition: "StopCmd",
              comment: "急停命令",
              x: 350,
              y: 100,
            },
            {
              source: "EmergencyStop",
              destination: "Idle",
              condition: "ResetCmd",
              comment: "复位后返回待机",
              x: 350,
              y: 200,
            },
          ],
        },
        Algorithms: [
          {
            Name: "RunConveyor",
            Comment: "输送机正常运行控制",
            Input: "SpeedReference, MaterialDetected",
            Output: "MotorSpeed, MaterialPresent",
            Code: "IF NOT MaterialDetected THEN\n    MotorSpeed := SpeedReference;\n    MaterialPresent := FALSE;\nELSE\n    MotorSpeed := 0;\n    MaterialPresent := TRUE;\nEND_IF;",
          },
          {
            Name: "RampUp",
            Comment: "加速斜坡控制",
            Input: "SpeedReference",
            Output: "MotorSpeed",
            Code: "MotorSpeed := MotorSpeed + (SpeedReference * 0.1);\nMotorSpeed := LIMIT(0, MotorSpeed, SpeedReference);",
          },
          {
            Name: "RampDown",
            Comment: "减速斜坡控制",
            Input: "",
            Output: "MotorSpeed",
            Code: "MotorSpeed := MotorSpeed - (SpeedReference * 0.2);\nMotorSpeed := LIMIT(0, MotorSpeed, SpeedReference);",
          },
          {
            Name: "EmergencyStop",
            Comment: "紧急停止控制",
            Input: "",
            Output: "MotorSpeed",
            Code: "MotorSpeed := 0;",
          },
        ],
      },
      {
        name: "提升机",
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
        InternalVars: [
          {
            name: "IsMoving",
            type: "bool",
            InitalVaule: "FALSE",
            description: "提升机移动状态标志",
          },
          {
            name: "IsOverloaded",
            type: "bool",
            InitalVaule: "FALSE",
            description: "超载状态标志",
          },
        ],
        ECC: {
          ECStates: [
            {
              name: "Idle",
              comment: "待机状态",
              x: 50,
              y: 50,
            },
            {
              name: "MovingUp",
              comment: "上升状态",
              x: 200,
              y: 50,
              ecAction: {
                algorithm: "CalculateSpeed",
                output: "MotorSpeed",
              },
            },
            {
              name: "MovingDown",
              comment: "下降状态",
              x: 200,
              y: 150,
              ecAction: {
                algorithm: "CalculateSpeed",
                output: "MotorSpeed",
              },
            },
            {
              name: "Emergency",
              comment: "紧急停止状态",
              x: 350,
              y: 100,
              ecAction: {
                algorithm: "EmergencyStop",
                output: "OverloadAlarm",
              },
            },
          ],
          ECTransitions: [
            {
              source: "Idle",
              destination: "MovingUp",
              condition: "StartLift AND TargetPosition > CurrentPosition",
              comment: "收到上升指令",
              x: 125,
              y: 30,
            },
            {
              source: "Idle",
              destination: "MovingDown",
              condition: "StartLift AND TargetPosition < CurrentPosition",
              comment: "收到下降指令",
              x: 125,
              y: 70,
            },
            {
              source: "MovingUp",
              destination: "Idle",
              condition: "PositionReached OR EmergencyStop",
              comment: "到达目标或急停",
              x: 225,
              y: 30,
            },
            {
              source: "MovingDown",
              destination: "Idle",
              condition: "PositionReached OR EmergencyStop",
              comment: "到达目标或急停",
              x: 225,
              y: 170,
            },
            {
              source: "MovingUp",
              destination: "Emergency",
              condition: "IsOverloaded",
              comment: "上升过程中超载",
              x: 275,
              y: 50,
            },
            {
              source: "MovingDown",
              destination: "Emergency",
              condition: "IsOverloaded",
              comment: "下降过程中超载",
              x: 275,
              y: 150,
            },
            {
              source: "Emergency",
              destination: "Idle",
              condition: "NOT EmergencyStop AND NOT IsOverloaded",
              comment: "解除急停状态",
              x: 225,
              y: 100,
            },
          ],
        },
        Algorithms: [
          {
            Name: "CalculateSpeed",
            Comment: "计算电机运行速度",
            Input: "CurrentPosition, TargetPosition, LoadWeight",
            Output: "MotorSpeed, PositionError",
            Code: "PositionError := ABS(TargetPosition - CurrentPosition);\nIF LoadWeight > MaxLoad THEN\n    IsOverloaded := TRUE;\n    MotorSpeed := 0;\nELSE\n    MotorSpeed := MIN(MaxSpeed, PositionError * SpeedFactor);\nEND_IF;",
          },
          {
            Name: "EmergencyStop",
            Comment: "紧急停止处理",
            Input: "EmergencyStop, IsOverloaded",
            Output: "OverloadAlarm",
            Code: "IF EmergencyStop OR IsOverloaded THEN\n    OverloadAlarm := TRUE;\n    MotorSpeed := 0;\nELSE\n    OverloadAlarm := FALSE;\nEND_IF;",
          },
        ],
      },
      {
        name: "移栽机",
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
        InternalVars: [
          {
            name: "IsMoving",
            type: "bool",
            InitalVaule: "FALSE",
            description: "移栽臂移动状态标志",
          },
          {
            name: "IsGripping",
            type: "bool",
            InitalVaule: "FALSE",
            description: "夹爪夹持状态标志",
          },
        ],
        ECC: {
          ECStates: [
            {
              name: "Idle",
              comment: "待机状态",
              x: 50,
              y: 50,
            },
            {
              name: "MovingToPick",
              comment: "移动至取件位置",
              x: 200,
              y: 50,
              ecAction: {
                algorithm: "CalculateMovePath",
                output: "MoveSpeed",
              },
            },
            {
              name: "Gripping",
              comment: "夹取工件",
              x: 350,
              y: 50,
              ecAction: {
                algorithm: "CalculateGripForce",
                output: "GripperForce",
              },
            },
            {
              name: "MovingToPlace",
              comment: "移动至放件位置",
              x: 200,
              y: 150,
              ecAction: {
                algorithm: "CalculateMovePath",
                output: "MoveSpeed",
              },
            },
            {
              name: "Releasing",
              comment: "释放工件",
              x: 50,
              y: 150,
              ecAction: {
                algorithm: "ReleaseWorkpiece",
                output: "TransferComplete",
              },
            },
            {
              name: "Emergency",
              comment: "紧急停止状态",
              x: 350,
              y: 150,
              ecAction: {
                algorithm: "EmergencyStop",
                output: "Alarm",
              },
            },
          ],
          ECTransitions: [
            {
              source: "Idle",
              destination: "MovingToPick",
              condition: "StartTransfer AND WorkpieceDetected",
              comment: "收到启动信号且工件到位",
              x: 125,
              y: 30,
            },
            {
              source: "MovingToPick",
              destination: "Gripping",
              condition: "CurrentPosition == TargetPosition",
              comment: "到达取件位置",
              x: 275,
              y: 30,
            },
            {
              source: "Gripping",
              destination: "MovingToPlace",
              condition: "IsGripping",
              comment: "夹取完成",
              x: 275,
              y: 100,
            },
            {
              source: "MovingToPlace",
              destination: "Releasing",
              condition: "CurrentPosition == TargetPosition",
              comment: "到达放件位置",
              x: 125,
              y: 100,
            },
            {
              source: "Releasing",
              destination: "Idle",
              condition: "NOT IsGripping",
              comment: "释放完成返回待机",
              x: 50,
              y: 100,
            },
            {
              source: "*",
              destination: "Emergency",
              condition: "EmergencyStop",
              comment: "任何状态下收到急停信号",
              x: 200,
              y: 200,
            },
          ],
        },
        Algorithms: [
          {
            Name: "CalculateMovePath",
            Comment: "计算移栽臂移动路径和速度",
            Input: "CurrentPosition, TargetPosition, WorkpieceWeight",
            Output: "MoveSpeed",
            Code: "VAR\n    Distance : REAL := ABS(TargetPosition - CurrentPosition);\n    MaxSpeed : REAL := 500.0; (* mm/s *)\n    WeightFactor : REAL := 1.0 - (WorkpieceWeight * 0.01);\nEND_VAR\n\nMoveSpeed := MIN(Distance * 0.5, MaxSpeed) * WeightFactor;",
          },
          {
            Name: "CalculateGripForce",
            Comment: "根据工件重量计算夹持力",
            Input: "WorkpieceWeight",
            Output: "GripperForce",
            Code: "GripperForce := WorkpieceWeight * 9.8 * 1.5; (* 安全系数1.5 *)",
          },
          {
            Name: "ReleaseWorkpiece",
            Comment: "释放工件控制",
            Input: "IsGripping",
            Output: "TransferComplete",
            Code: "IsGripping := FALSE;\nTransferComplete := TRUE;",
          },
          {
            Name: "EmergencyStop",
            Comment: "紧急停止处理",
            Input: "EmergencyStop",
            Output: "Alarm",
            Code: "MoveSpeed := 0.0;\nGripperForce := 0.0;\nAlarm := TRUE;",
          },
        ],
      },
    ];

    // 保存功能块配置
    await window.ipcApi.saveBlockCategories(test_categories);

    // 触发创建项目成功事件
    emit("createProject");
  } catch (error) {
    let errorMessage = window.ipcApi.extractErrorMessage(error);
    ElNotification({
      title: "创建项目失败",
      message: errorMessage,
      showClose: false,
      type: "error",
      duration: 2500,
      customClass: "default-notification",
    });
  } finally {
    // 无论成功还是失败，都关闭加载界面
    loading.close();
  }
}
</script>

<style scoped>
.main {
  width: 50%;
  height: 75%;
  background-color: white;
  border-radius: 10px;
  border: 1px solid var(--color-dark-1);
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow-y: auto;
}

.title {
  font-size: 30px;
  font-weight: bold;
  color: var(--color-dark-1);
  margin-bottom: 40px;
}

.input-item {
  display: flex;
  flex-direction: row;
  width: 90%;
  gap: 20px;
  margin: 10px 20px;
}

.label {
  font-size: 16px;
  width: 120px;
  height: 35px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--color-dark-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input {
  height: 35px;
  width: 100%;
  flex: 1;
  padding: 0 10px;
  font-size: 16px;
  color: black;
}

.collapse-input {
  height: 30px;
  width: 100%;
  flex: 1;
  padding: 0 10px;
  font-size: 16px;
  color: black;
}

.textarea {
  height: auto;
}

.tips {
  font-size: 14px;
  width: fit-content;
  flex: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  padding: 5px;
  border-radius: 5px;
}

.custom-button {
  flex: 1;
  height: 40px;
  background-color: white;
  border-radius: 6px;
  font-weight: 600;
  border: 1px solid var(--color-dark-0);
  letter-spacing: 2px;
  transition: background-color 0.15s ease;
}

.custom-button:hover {
  background-color: #f0f0f0;
  cursor: pointer;
}

.custom-button.add-btn {
  margin-top: 5px;
  width: calc(100% - 20px);
  height: 30px;
  /* background-color: var(--color-dark-0); */
  border: 1px solid var(--color-dark-0);
  color: var(--color-dark-0);
  border-radius: 6px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-right: 20px;
}

.collapse {
  width: 100%;
  margin-top: 10px;
  padding: 0 10px;
}

div .collapse-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row;
}

button.delete-btn {
  width: 20px;
  height: 20px;
  flex: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.2s ease, boder-color 0.2s ease;
}

button .delete-btn.clicked {
  background-color: var(--color-important);
  width: 40px;
  color: white;
  border-color: transparent;
}

.delete-btn .delete-btn-text {
  font-size: 9px;
  width: 40px;
  word-break: keep-all;
  overflow: hidden;
}

div .collapse-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row;
}

span .collapse-title {
  flex: 1;
}

span .collapse-title:hover {
  font-weight: 600;
}

.feature-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
}

.feature-item span {
  width: 50px;
  font-weight: 600;
}

.feature-item :deep(.el-input) {
  flex: 1;
  max-width: 300px;
  margin-right: 10px;
}

.feature-item :deep(.el-select) {
  flex: 1;
  max-width: 300px;
  margin-right: 10px;
}

.create-btn-wrapper {
  width: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  margin-top: 20px;
  margin-bottom: 20px;
}

.create-btn {
  flex: unset;
  align-self: flex-end;
  width: 60%;
  background-color: var(--color-dark-2);
  transition: box-shadow 0.15s ease, background-color 0.15s ease;
  color: white;
}

.create-btn:hover {
  background-color: var(--color-dark-0);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}
</style>
