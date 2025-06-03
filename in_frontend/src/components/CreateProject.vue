<template>
  <div class="main custom-scrollbar" v-if="!showLoading">
    <button
      v-if="!showLoading"
      class="back-btn custom-button"
      @click="emit('back')"
    >
      <ElIcon><Back /></ElIcon>
    </button>
    <div class="title">创建新项目</div>
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
        你的项目将会储存在 {{ projectPath }} 内的 {{ projectName }} 文件夹下
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
        <button class="add-btn custom-button" @click="addItem">添加</button>
      </ElCollapse>
    </div>
    <div class="create-btn-wrapper">
      <button class="custom-button create-btn" @click="createProject">
        创建项目
      </button>
    </div>
  </div>
  <Transition name="loading-fade" mode="out-in">
    <LLMLoading
      ref="LLMLoadingRef"
      :progress="LLM_progress"
      :messages="LLM_messages"
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
} from "element-plus";
import { Files, Close, Back } from "@element-plus/icons-vue";
import { defineProps, ref, defineEmits } from "vue";
import service from "@/util/ajax_inst";
import LLMLoading from "./LLMLoading.vue";
const props = defineProps({
  projectPath: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["createProject", "back"]);

const projectName = ref("");
const projectDescription = ref("");
const activeBlocks = ref([]);
const deleteButtonClickedMap = ref([]);
const blocks = ref([]);
const showLoading = ref(false);
const LLM_progress = ref(0);
const LLM_messages = ref([]);
const LLMLoadingRef = ref(null);
const blockConfOrigin = {
  name: "",
  description: "",
};

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
      customClass: "default-notification",
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

      eventSource.onopen = () => {
        LLMLoadingRef.value.resetMsg();
        LLMLoadingRef.value.addMsg("正在连接到服务器，准备创建项目...");
        console.log("SSE连接已打开");
      };

      eventSource.addEventListener("status", (event) => {
        const data = JSON.parse(event.data);
        const msg = data.message;
        const progress = data.progress;
        const replace = data.replace || false;
        LLMLoadingRef.value.updateProgress(progress);
        LLMLoadingRef.value.addMsg(msg, replace);
        // TODO: 处理进度更新
        console.log(`进度: ${progress}, 消息: ${msg}`);
      });

      eventSource.addEventListener("complete", (event) => {
        result = JSON.parse(event.data);
        LLMLoadingRef.value.addMsg("项目创建完成！正在处理...");
        console.log("项目创建完成:", result);
      });

      eventSource.addEventListener("close", (event) => {
        eventSource.close();
        resolve();
      });

      eventSource.onerror = (error) => {
        eventSource.close();
        reject(new Error("创建项目过程中连接中断"));
      };
    });

    // 保存功能块配置
    await window.ipcApi.saveBlockCategories(result.result);

    // 触发创建项目成功事件
    setTimeout(() => {
      emit("createProject");
    }, 2000);
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
    showLoading.value = false;
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
  position: relative;
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

.back-btn {
  position: absolute;
  width: 60px;
  height: 40px;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.back-btn:hover {
  background-color: rgba(65, 112, 255, 0.2);
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.loading-fade-enter-to,
.loading-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
