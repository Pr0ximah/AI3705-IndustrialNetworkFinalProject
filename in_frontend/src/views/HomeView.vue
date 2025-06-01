<template>
  <ElContainer class="home-container cannot-select">
    <ElHeader class="container-header drag">
      <div style="display: flex; gap: 10px; margin-left: 20px">
        <div>Home</div>
      </div>
      <WorkspaceMenu
        @save="emitSaveWorkspace"
        @load="emitLoadWorkspace"
        @convert="emitConvertWorkspace"
        v-if="!showWelcome"
      />
      <div
        style="
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 10px;
        "
      >
        <CanvasControl v-if="!showWelcome" />
        <WindowControl />
      </div>
    </ElHeader>
    <ElMain class="container-main">
      <Transition name="welcome-fade" mode="out-in">
        <WelcomeMask
          v-if="showWelcome"
          style="z-index: 500"
          @pass-create-project="projectCreated"
        />
      </Transition>
      <BlockCanvas ref="blockCanvasRef" />
      <Transition name="select-workspace-fade" mode="out-in">
        <SelectWorkspace
          style="position: absolute; top: 0; left: 0; z-index: 1000"
          v-if="showSelectWorkspace"
          :workspaces="workspacelist"
          @close="showSelectWorkspace = false"
          @select="loadWorkspaceSelected"
        />
      </Transition>
    </ElMain>
    <div :style="{ opacity: showMask ? 1 : 0 }" class="homeview-mask" />
  </ElContainer>
</template>

<script setup>
import BlockCanvas from "@/components/BlockCanvas.vue";
import CanvasControl from "@/components/CanvasControl.vue";
import WindowControl from "@/components/WindowControl.vue";
import {
  ElContainer,
  ElMessageBox,
  ElHeader,
  ElMain,
  ElLoading,
  ElNotification,
} from "element-plus";
import { computed, ref, provide, onMounted, onBeforeUnmount } from "vue";
import WelcomeMask from "@/components/WelcomeMask.vue";
import WorkspaceMenu from "@/components/WorkspaceMenu.vue";
import SelectWorkspace from "@/components/SelectWorkspace.vue";
import service from "@/util/ajax_inst";

const blockCanvasRef = ref(null);
const clearWorkspaceValid = computed(() => {
  return blockCanvasRef.value?.clearWorkspaceValid;
});
const scale = computed(() => {
  return blockCanvasRef.value?.scale ?? 1;
});
const showMask = ref(false);
const showWelcome = ref(true);
const showSelectWorkspace = ref(false);
const workspacelist = ref([]);

provide("blockCanvasRef", blockCanvasRef);
provide("clearWorkspaceValid", clearWorkspaceValid);
provide("scale", scale);

async function emitSaveWorkspace() {
  let workspace_conf = JSON.stringify(blockCanvasRef.value.getWorkspace());
  let loading = null;
  try {
    const { value: name } = await ElMessageBox.prompt(
      "请输入组态名称",
      "保存组态",
      {
        type: "info",
        showClose: false,
        confirmButtonText: "保存",
        cancelButtonText: "取消",
        cancelButtonClass: "cancel-btn",
        confirmButtonClass: "confirm-btn",
        customClass: "default-message-box",
        inputValidator: (value) => {
          if (!value || value.trim() === "") {
            return "组态名称不能为空";
          }
          return true;
        },
        inputErrorMessage: "请输入有效的组态名称",
      }
    );
    // 处理保存逻辑
    loading = ElLoading.service({
      lock: true,
      customClass: "default-loading",
      text: "正在保存组态...",
      background: "rgba(255, 255, 255, 0.7)",
    });
    const res = await window.ipcApi.saveWorkspace(workspace_conf, name);
    ElNotification({
      title: "保存成功",
      showClose: false,
      message: `组态已成功保存到【${res.path}】`,
      type: "success",
      duration: 3000,
      customClass: "default-notification",
    });
  } catch (error) {
    let errorMessage = window.ipcApi.extractErrorMessage(error);
    if (error === "cancel" || errorMessage === "CANCEL") {
      // 用户取消保存
    } else {
      ElNotification({
        title: "组态保存失败",
        showClose: false,
        message: `${error.message || error}`,
        type: "error",
        duration: 3000,
        customClass: "default-notification",
      });
    }
  }
  loading?.close();
}

async function emitLoadWorkspace() {
  workspacelist.value = await window.ipcApi.getWorkspaceList();
  showSelectWorkspace.value = true;
}

async function loadWorkspaceSelected(name) {
  showSelectWorkspace.value = false;
  let loading = null;
  try {
    loading = ElLoading.service({
      lock: true,
      customClass: "default-loading",
      text: "正在加载组态...",
      background: "rgba(255, 255, 255, 0.7)",
    });
    let res = await window.ipcApi.loadWorkspace(name);
    res = JSON.parse(res);
    await blockCanvasRef.value.loadWorkspace(res);
    ElNotification({
      title: "组态加载成功",
      showClose: false,
      message: `组态【${name}】已成功加载`,
      type: "success",
      duration: 3000,
      customClass: "default-notification",
    });
  } catch (error) {
    let errorMessage = window.ipcApi.extractErrorMessage(error);
    ElNotification({
      title: "组态加载失败",
      showClose: false,
      message: `${error.message || error}`,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
  }
  loading?.close();
}

async function emitConvertWorkspace() {
  let workspace_conf = blockCanvasRef.value.getWorkspace();
  let loading = null;
  try {
    loading = ElLoading.service({
      lock: true,
      customClass: "default-loading",
      text: "正在生成代码...",
      background: "rgba(255, 255, 255, 0.7)",
    });
    const save_dir = await window.ipcApi.selectCodeOutputPath();
    const data = await service.post("/outputs/convert", {
      conf: JSON.stringify(workspace_conf),
      output_path: save_dir,
    });
    if (data.data.success) {
      ElNotification({
        title: "代码已生成！",
        showClose: false,
        message: `IEC61499代码已保存到 ${save_dir}`,
        type: "success",
        duration: 3000,
        customClass: "default-notification",
      });
    } else {
      ElNotification({
        title: "代码生成失败",
        showClose: false,
        message: `${data.data.message}`,
        type: "error",
        duration: 3000,
        customClass: "default-notification",
      });
    }
  } catch (error) {
    let errorMessage = window.ipcApi.extractErrorMessage(error);
    if (errorMessage === "CANCEL") {
      // 用户取消保存
    } else {
      ElNotification({
        title: "代码生成失败",
        showClose: false,
        message: `${errorMessage || error}`,
        type: "error",
        duration: 3000,
        customClass: "default-notification",
      });
    }
  }
  loading?.close();
}

function projectCreated() {
  showWelcome.value = false;
  blockCanvasRef.value.initWorkspace();
  ElNotification({
    title: "欢迎使用",
    showClose: false,
    message: "欢迎使用本系统，祝您工作愉快！",
    type: "success",
    duration: 3000,
    customClass: "default-notification",
  });
}

onMounted(() => {
  window.ipcApi.receive("open-block-editor-signal", () => {
    showMask.value = true;
  });
  window.ipcApi.receive("close-block-editor-signal", async () => {
    if (!blockCanvasRef.value) {
      return;
    }
    // 从文件中加载刷新的功能块配置
    const categoriesJSON = await window.ipcApi.loadBlockCategories();
    blockCanvasRef.value.loadCategoriesConfigFromJSON(categoriesJSON);
    const workspace_saved = blockCanvasRef.value.getWorkspace();
    console.log("workspace_saved", workspace_saved);
    if (!workspace_saved) {
      ElNotification({
        title: "编辑器保存错误！",
        showClose: false,
        message: "请先保存再关闭编辑器。",
        type: "warning",
        duration: 2000,
        customClass: "default-notification",
      });
      return;
    }
    await blockCanvasRef.value.loadWorkspace(workspace_saved);
    showMask.value = false;
  });
});
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

.homeview-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(3px); /* 添加模糊效果 */
  z-index: 9999; /* 确保遮罩层在最上层 */
  transition: opacity 0.3s ease;
  pointer-events: none;
}

/* 添加欢迎页面的过渡效果 */
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
  transform: translateY(-100px);
}

.welcome-fade-enter-to,
.welcome-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.select-workspace-fade-enter-active,
.select-workspace-fade-leave-active {
  transition: opacity 0.15s ease-in-out;
}

.select-workspace-fade-enter-from,
.select-workspace-fade-leave-to {
  opacity: 0;
}

.select-workspace-fade-enter-to,
.select-workspace-fade-leave-from {
  opacity: 1;
}

.el-messagebox.default-message-box {
  border-radius: 12px;
  padding: 20px 25px;
}
</style>
