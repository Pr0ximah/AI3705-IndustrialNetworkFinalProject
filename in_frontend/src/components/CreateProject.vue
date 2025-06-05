<template>
  <Transition name="main-fade" mode="out-in">
    <div class="wrapper" v-if="!showLoading">
      <div class="llm-select">
        <button class="custom-button" @click="checkAndRefreshAPIConfig">
          <ElIcon
            size="16"
            style="margin-right: 5px"
            :class="{ 'is-loading': isRefreshing }"
            ><Refresh
          /></ElIcon>
          刷新API配置
        </button>
        <ElRadioGroup v-model="activeModel" class="model-select">
          <ElRadioButton
            v-for="model in availableModels"
            :key="model"
            :label="model"
            class="model-option"
          >
            <img :src="getIconByLLMName(model)" class="model-icon" />
            {{ model }}
          </ElRadioButton>
        </ElRadioGroup>
      </div>
      <div class="main">
        <div class="llm-card">
          <div class="title">
            <img src="@/assets/AI.png" />
          </div>
          <div class="input-wrapper">
            <textarea
              v-model="llmUserInput"
              placeholder="请详细描述你的需求，AI会帮你创建项目配置"
            />
          </div>
          <button class="custom-button" @click="AIRecommend">发送</button>
        </div>
        <div class="user-card">
          <button class="back-btn custom-button" @click="emit('back')">
            <ElIcon size="20"><Back /></ElIcon>
          </button>
          <div class="title">创建新项目</div>
          <div class="inner custom-scrollbar">
            <div class="input-item">
              <div class="label">项目名称</div>
              <ElInput
                v-model="projectName"
                placeholder="请输入项目名称"
                class="input"
              />
            </div>
            <div class="tips">
              <ElIcon size="14" style="margin-right: 8px"><Files /></ElIcon>
              <div>
                你的项目将会储存在 {{ projectPath }} 内的
                {{ projectName }} 文件夹下
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
                    ></ElInput>
                  </div>
                </ElCollapseItem>
                <button class="add-btn custom-button" @click="addItem">
                  添加
                </button>
              </ElCollapse>
            </div>
          </div>
          <div class="create-btn-wrapper">
            <button class="custom-button create-btn" @click="createProject">
              <span class="create-text">创建项目</span>
              <ElIcon size="35"><Right /></ElIcon>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  <Transition name="loading-fade" mode="out-in">
    <LLMLoading
      ref="LLMLoadingRef"
      :LLM_Display="{
        icon: getIconByLLMName(activeModel),
        name: activeModel,
      }"
      v-if="showLoading"
    />
  </Transition>
</template>

<script setup>
import {
  ElCollapse,
  ElIcon,
  ElInput,
  ElCollapseItem,
  ElNotification,
  ElRadioButton,
  ElRadioGroup,
  ElMessageBox,
} from "element-plus";
import { Files, Close, Back, Right, Refresh } from "@element-plus/icons-vue";
import { defineProps, ref, defineEmits, defineExpose, onMounted } from "vue";
import { service } from "@/util/ajax_inst.js";
import LLMLoading from "./LLMLoading.vue";
const props = defineProps({
  projectPath: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["createProject", "back"]);

function importAll(r) {
  // 动态导入所有图片
  const images = {};
  r.keys().forEach((key) => {
    const name = key.replace("./", "").replace(/\.(png|svg)$/, "");
    // 如果文件名包含连字符，也添加连字符分隔的各个部分作为key
    if (name.includes("-")) {
      const parts = name.split("-");
      parts.forEach((part) => {
        if (part && !images[part]) {
          images[part] = r(key);
        }
      });
    } else {
      images[name] = r(key);
    }
  });
  return images;
}

const projectName = ref("");
const projectDescription = ref("");
const llmUserInput = ref("");
const activeBlocks = ref([]);
const deleteButtonClickedMap = ref([]);
const blocks = ref([]);
const showLoading = ref(false);
const LLMLoadingRef = ref(null);
const apiConfigStatus = ref(false);
const availableModels = ref([]);
const activeModel = ref("");
const isRefreshing = ref(false);
const modelNameIconMap = importAll(
  require.context("@/assets/LLM_icons", false, /\.(png|svg)$/)
);
const blockConfOrigin = {
  name: "",
  description: "",
};

function getIconByLLMName(llmName) {
  for (const modelName in modelNameIconMap) {
    if (llmName.toLowerCase().includes(modelName)) {
      return modelNameIconMap[modelName];
    }
  }
  return modelNameIconMap.default;
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

async function checkAndRefreshAPIConfig() {
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
  try {
    await service.get("/inputs/refresh_api_config");
  } catch (error) {
    ElNotification({
      title: "错误",
      showClose: false,
      message: error.message,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
    return false;
  }
  const res = await service.get("/inputs/check_api_config");
  if (res.data.status !== "success") {
    apiConfigStatus.value = false;
    ElNotification({
      title: "错误",
      showClose: false,
      message: res.data.message,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
    return false;
  }
  apiConfigStatus.value = true;
  const models = await service.get("/inputs/get_available_models");
  if (models.data.status !== "success") {
    ElNotification({
      title: "错误",
      showClose: false,
      message: models.data.message,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
    return false;
  }
  availableModels.value = models.data.available_models || [];
  activeModel.value = availableModels.value[0] || "";
  return true;
}

async function createProject() {
  let simulateTimer = null;
  let simulatedProgress = 0;

  if (!projectName.value.trim()) {
    ElNotification({
      title: "错误",
      showClose: false,
      message: "项目名称不能为空",
      type: "warning",
      duration: 3000,
      customClass: "default-notification",
    });
    return;
  }
  if (!projectDescription.value.trim()) {
    ElNotification({
      title: "错误",
      showClose: false,
      message: "项目描述不能为空",
      type: "warning",
      duration: 3000,
      customClass: "default-notification",
    });
    return;
  }
  const projectData = {
    name: projectName.value,
    description: projectDescription.value,
    blocks: blocks.value,
  };

  // 打开加载界面
  showLoading.value = true;

  try {
    // 创建项目目录
    await window.ipcApi.createProjectDir(props.projectPath, projectName.value);

    const res = await service.post("/inputs/create_project", {
      conf: JSON.stringify(projectData),
      model: activeModel.value,
    });
    if (res.data.status !== "success") {
      throw new Error(res.data.message || "创建项目失败");
    }
    const id = res.data.connection_id;

    let result = null;

    // 使用EventSource监听项目创建进度
    await new Promise((resolve, reject) => {
      const eventSource = new EventSource(
        `${process.env.VUE_APP_API_BASE_URL}/inputs/sse/${id}`
      );

      let isCompleted = false;
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          clearInterval(simulateTimer);
          eventSource.close();
        }
      };

      eventSource.onopen = () => {
        LLMLoadingRef.value.resetMsg();
        LLMLoadingRef.value.addMsg("服务器连接成功 ✅");
        console.log("SSE连接已打开");
      };

      eventSource.addEventListener("status", (event) => {
        const data = JSON.parse(event.data);
        const msg = data.message;
        const progress = data.progress;
        const next_progress = data.next_progress || 0;
        const replace = data.replace || false;
        const estimateTime = data.estimate_time || null; // 检测是否需要模拟加载动画，1点1点加载
        LLMLoadingRef.value.updateProgress(progress);
        LLMLoadingRef.value.addMsg(msg, replace);
        if (estimateTime) {
          // 如果已存在模拟定时器，先清除
          if (simulateTimer) {
            clearInterval(simulateTimer);
            simulateTimer = null;
          }

          simulatedProgress = progress;
          const totalSteps = next_progress - simulatedProgress;
          // 防止除零错误
          if (totalSteps <= 0) {
            LLMLoadingRef.value.updateProgress(progress);
            return;
          }
          const intervalTime = (estimateTime * 1000) / totalSteps;
          simulateTimer = setInterval(() => {
            if (simulatedProgress < next_progress) {
              simulatedProgress += 1;
              LLMLoadingRef.value.updateProgress(simulatedProgress);
            } else {
              // 到达目标进度，清理定时器
              clearInterval(simulateTimer);
              simulateTimer = null;
            }
          }, intervalTime);
        } else {
          // 如果没有预估时间，说明后端事件已结束
          // 立即清除模拟定时器并直接更新到真实进度
          if (simulateTimer) {
            clearInterval(simulateTimer);
            simulateTimer = null;
          }

          // 重置模拟进度变量，为下一个事件做准备
          simulatedProgress = 0;

          // 直接更新到真实进度
          LLMLoadingRef.value.updateProgress(progress);
        }
      });

      eventSource.addEventListener("complete", (event) => {
        result = JSON.parse(event.data);
        LLMLoadingRef.value.addMsg("项目创建完成！正在处理...");
        console.log("项目创建完成:", result);
        isCompleted = true;
        resolve();
      });

      eventSource.addEventListener("close", (event) => {
        cleanup();
        if (isCompleted) {
          resolve();
        } else {
          reject(new Error("连接在项目完成前被关闭"));
        }
      });

      eventSource.onerror = (error) => {
        console.log("SSE服务错误:", error);

        // 如果项目已完成，忽略后续错误
        if (isCompleted) {
          cleanup();
          resolve();
          return;
        }

        // 如果是连接状态，不要立即失败
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log("正在重新连接，继续等待...");
          return;
        }

        cleanup();
        reject(new Error("连接发生错误！请再试一次吧"));
      };
    });

    // 保存功能块配置
    await window.ipcApi.saveBlockCategories(result.result);

    // 触发创建项目成功事件
    setTimeout(() => {
      emit("createProject");
      showLoading.value = false;
    }, 2000);
  } catch (error) {
    let errorMessage = window.ipcApi.extractErrorMessage(error);
    showLoading.value = false;
    ElNotification({
      title: "创建项目失败",
      message: errorMessage,
      showClose: false,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
  }
}

async function AIRecommend() {
  let simulateTimer = null;
  let simulatedProgress = 0;

  if (!llmUserInput.value.trim()) {
    ElNotification({
      title: "提示",
      showClose: false,
      message: "需求不能为空",
      type: "warning",
      duration: 3000,
      customClass: "default-notification",
    });
    return;
  }
  let data = {
    userInput: llmUserInput.value.trim(),
    model: activeModel.value,
  };

  if (projectName.value.trim() || projectDescription.value.trim()) {
    try {
      await ElMessageBox.confirm(
        "AI智配将会清空已有项目配置，是否继续？",
        "提示",
        {
          confirmButtonText: "确定清空",
          cancelButtonText: "取消",
          type: "warning",
          showClose: false,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          cancelButtonClass: "cancel-btn",
          confirmButtonClass: "confirm-btn",
          customClass: "clear-workspace-dialog",
        }
      );
    } catch (error) {
      if (error === "cancel") {
        return;
      }
    }
  }
  showLoading.value = true;

  try {
    const res = await service.post("/inputs/get_ai_recommend", data);
    if (res.data.status !== "success") {
      throw new Error(res.data.message || "获取AI推荐失败");
    }
    const id = res.data.connection_id;
    let result = null;

    await new Promise((resolve, reject) => {
      const eventSource = new EventSource(
        `${process.env.VUE_APP_API_BASE_URL}/inputs/sse/${id}`
      );

      let isCompleted = false;
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          clearInterval(simulateTimer);
          eventSource.close();
        }
      };

      eventSource.onopen = () => {
        LLMLoadingRef.value.resetMsg();
        LLMLoadingRef.value.addMsg("服务器连接成功 ✅");
        console.log("SSE连接已打开");
      };

      eventSource.addEventListener("status", (event) => {
        const data = JSON.parse(event.data);
        const msg = data.message;
        const progress = data.progress;
        const next_progress = data.next_progress || 0;
        const replace = data.replace || false;
        const estimateTime = data.estimate_time || null; // 检测是否需要模拟加载动画，1点1点加载
        LLMLoadingRef.value.updateProgress(progress);
        LLMLoadingRef.value.addMsg(msg, replace);
        if (estimateTime) {
          // 如果已存在模拟定时器，先清除
          if (simulateTimer) {
            clearInterval(simulateTimer);
            simulateTimer = null;
          }

          simulatedProgress = progress;
          const totalSteps = next_progress - simulatedProgress;
          // 防止除零错误
          if (totalSteps <= 0) {
            LLMLoadingRef.value.updateProgress(progress);
            return;
          }
          const intervalTime = (estimateTime * 1000) / totalSteps;
          simulateTimer = setInterval(() => {
            if (simulatedProgress < next_progress) {
              simulatedProgress += 1;
              LLMLoadingRef.value.updateProgress(simulatedProgress);
            } else {
              // 到达目标进度，清理定时器
              clearInterval(simulateTimer);
              simulateTimer = null;
            }
          }, intervalTime);
        } else {
          // 如果没有预估时间，说明后端事件已结束
          // 立即清除模拟定时器并直接更新到真实进度
          if (simulateTimer) {
            clearInterval(simulateTimer);
            simulateTimer = null;
          }

          // 重置模拟进度变量，为下一个事件做准备
          simulatedProgress = 0;

          // 直接更新到真实进度
          LLMLoadingRef.value.updateProgress(progress);
        }
      });

      eventSource.addEventListener("complete", (event) => {
        result = JSON.parse(event.data);
        LLMLoadingRef.value.addMsg("AI智配已成功生成！正在处理...");
        console.log("AI智配完成:", result);
        isCompleted = true;
        resolve();
      });

      eventSource.addEventListener("close", (event) => {
        cleanup();
        if (isCompleted) {
          resolve();
        } else {
          reject(new Error("连接在AI智配生成完成前被关闭"));
        }
      });

      eventSource.onerror = (error) => {
        console.log("SSE服务错误:", error);

        // 如果项目已完成，忽略后续错误
        if (isCompleted) {
          cleanup();
          resolve();
          return;
        }

        // 如果是连接状态，不要立即失败
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log("正在重新连接，继续等待...");
          return;
        }

        cleanup();
        reject(new Error("连接发生错误！请再试一次吧"));
      };
    });

    // 清空现有的功能块配置
    blocks.value = [];
    deleteButtonClickedMap.value = [];
    activeBlocks.value = [];

    // 将AI推荐的功能块配置添加到blocks中
    result.result.blocks.forEach((block, index) => {
      blocks.value.push({
        name: block.name,
        description: block.description,
      });
      deleteButtonClickedMap.value.push(false);
      activeBlocks.value.push(`block-${index}`);
    });

    // 更新项目名称和描述
    projectName.value = result.result.name || "";
    projectDescription.value = result.result.description || "";

    // 触发AI智配成功事件
    setTimeout(() => {
      showLoading.value = false;
    }, 2000);
  } catch (error) {
    showLoading.value = false;
    ElNotification({
      title: "AI智配失败",
      message: error.message,
      showClose: false,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
  }
}

onMounted(async () => {
  await checkAndRefreshAPIConfig();
});

defineExpose({
  showLoading,
});
</script>

<style scoped>
.main {
  width: 80%;
  height: 80%;
  margin-bottom: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  max-height: calc(100% - 100px);
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
  align-items: flex-end;
  margin-top: 30px;
}

.create-btn {
  flex: unset;
  height: 60px;
  width: 60px;
  border-radius: 40px;
  background-color: var(--color-dark-2);
  transition: box-shadow 0.15s ease, background-color 0.15s ease,
    width 0.15s ease;
  color: white;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-btn:hover {
  width: 200px;
}

.create-btn:hover {
  background-color: var(--color-dark-0);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.back-btn {
  position: absolute;
  width: 60px;
  height: 40px;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background-color: transparent;
  border: 1px solid var(--color-dark-0);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.back-btn:hover {
  background-color: rgba(65, 112, 255, 0.1);
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
  transform: scale(1.5);
}

.loading-fade-enter-to,
.loading-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.main-fade-enter-active,
.main-fade-leave-active {
  transition: transform 0.5s ease, opacity 0.5s ease;
}

.main-fade-enter-from,
.main-fade-leave-to {
  transform: scale(0.5);
  opacity: 0;
}

.main-fade-enter-to,
.main-fade-leave-from {
  transform: scale(1);
  opacity: 1;
}

.create-text {
  opacity: 0;
  margin-right: 0;
  font-size: 20px;
  width: 0;
  color: white;
  white-space: nowrap;
  transition: width 0.15s, opacity 0.15s, margin-right 0.15s;
}

.create-btn:hover .create-text {
  width: 100px;
  margin-right: 5px;
  opacity: 1;
}

.llm-card {
  width: 35%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(
    -225deg,
    rgba(105, 234, 203, 0.3) 0%,
    rgba(234, 204, 248, 0.3) 48%,
    rgba(102, 84, 241, 0.3) 100%
  );
  background-size: 400% 400%;
  animation: gradientShift 12s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.user-card {
  width: 65%;
  padding: 30px;
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  justify-content: flex-start;
}

.llm-card .title {
  height: 60px;
  margin-top: 30px;
  margin-bottom: 0;
  flex-shrink: 0;
}

.llm-card img {
  height: 100%;
}

.llm-card .input-wrapper {
  margin: 20px 40px;
  width: calc(100% - 80px);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.llm-card textarea {
  width: calc(100% - 22px);
  height: 100%;
  border-radius: 5px;
  font-family: inherit;
  font-size: 16px;
  padding: 5px 11px;
  resize: none;
  border: 1px solid var(--color-dark-0);
  box-shadow: inset 0 0 0 1 transparent;
  transition: box-shadow 0.1s;
}

.llm-card textarea:active,
.llm-card textarea:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--color-dark-0);
}

.llm-card button {
  width: 60%;
  height: 40px;
  margin-top: 10px;
  margin-bottom: 30px;
  flex: unset;
  transition: all 0.1s ease;
}

.llm-card button:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.llm-select {
  height: 75px;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.model-select {
  height: 100%;
  transition: all 0.1s;
}

.model-option:first-child :deep(.el-radio-button__inner) {
  border-radius: 8px 0 0 8px;
}

.model-option:last-child :deep(.el-radio-button__inner) {
  border-radius: 0 8px 8px 0;
}

.model-option:only-child :deep(.el-radio-button__inner) {
  border-radius: 8px;
}

.model-option :deep(.el-radio-button__inner) {
  background-color: rgba(0, 0, 0, 0.1);
  font-size: large;
  font-weight: bold;
  text-align: center;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-width: 1px;
}

.model-option :deep(.el-radio-button__inner):hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.model-option.is-active :deep(.el-radio-button__inner) {
  background-color: rgba(60, 62, 173, 0.05) !important;
  color: var(--color-dark-0) !important;
  border-color: transparent !important;
  box-shadow: inset 0 0 0 2px var(--color-dark-0) !important;
}

.model-icon {
  height: 30px;
  width: 30px;
  margin-right: 10px;
}

.llm-select button {
  background-color: transparent;
  margin-bottom: 5px;
  height: 30px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
}

.is-loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
