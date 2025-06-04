<template>
  <ElContainer class="home-container cannot-select">
    <ElHeader class="container-header drag">
      <div style="display: flex; gap: 10px; height: 100%">
        <div
          v-if="(!showWelcome || workspaceInited) && !showWelcomeLoadingPage"
          class="home-icon-btn no-drag"
        >
          <img
            src="/logo.png"
            class="home-icon"
            @click="showWelcome = !showWelcome"
          />
        </div>
      </div>
      <Transition name="opacity-fade" mode="out-in">
        <WorkspaceMenu
          @save="emitSaveWorkspace"
          @load="emitLoadWorkspace"
          @convert="emitConvertWorkspace"
          v-if="!showWelcome"
        />
      </Transition>
      <div
        style="
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 10px;
        "
      >
        <Transition name="opacity-fade" mode="out-in">
          <CanvasControl v-if="!showWelcome" />
        </Transition>
        <WindowControl
          :before-close="autoSaveWorkspace"
          style="height: var(--header-height)"
        />
      </div>
    </ElHeader>
    <ElMain class="container-main">
      <Transition name="welcome-fade" mode="out-in">
        <WelcomeMask
          ref="welcomeMaskRef"
          :workspace-inited="workspaceInited"
          v-if="showWelcome"
          style="z-index: 500"
          @pass-create-project="projectCreated"
        />
      </Transition>
      <Transition name="opacity-fade" mode="out-in">
        <BlockCanvas
          v-show="!showWelcome || workspaceInited"
          :enable-key-down-event-in-block-canvas="
            enableKeyDownEventInBlockCanvas
          "
          ref="blockCanvasRef"
        />
      </Transition>
      <Transition name="select-workspace-fade" mode="out-in">
        <SelectWorkspace
          style="position: absolute; top: 0; left: 0; z-index: 1000"
          v-if="showSelectWorkspace"
          :workspaces="workspacelist"
          @close="showSelectWorkspace = false"
          @select="loadWorkspaceSelected"
        />
      </Transition>
      <Transition name="select-workspace-fade" mode="out-in">
        <SaveWorkspace
          style="position: absolute; top: 0; left: 0; z-index: 1000"
          v-if="showSaveWorkspace"
          @close="showSaveWorkspace = false"
          @select="saveWorkspace"
        />
      </Transition>
    </ElMain>
    <div :style="{ opacity: showMask ? 1 : 0 }" class="homeview-mask" />
    <div v-if="!workspaceInited" class="background">
      <img src="@/assets/background.png" />
    </div>
  </ElContainer>
</template>

<script setup>
import BlockCanvas from "@/components/BlockCanvas.vue";
import CanvasControl from "@/components/CanvasControl.vue";
import WindowControl from "@/components/WindowControl.vue";
import {
  ElContainer,
  ElHeader,
  ElMain,
  ElLoading,
  ElNotification,
  ElMessageBox,
} from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { computed, ref, provide, onMounted, markRaw } from "vue";
import WelcomeMask from "@/components/WelcomeMask.vue";
import WorkspaceMenu from "@/components/WorkspaceMenu.vue";
import SaveWorkspace from "@/components/SaveWorkspace.vue";
import SelectWorkspace from "@/components/SelectWorkspace.vue";
import { service, FBB_service } from "@/util/ajax_inst.js";

const blockCanvasRef = ref(null);
const welcomeMaskRef = ref(null);
const clearWorkspaceValid = computed(() => {
  return blockCanvasRef.value?.clearWorkspaceValid;
});
const scale = computed(() => {
  return blockCanvasRef.value?.scale ?? 1;
});
const showMask = ref(false);
const showWelcome = ref(true);
const showSelectWorkspace = ref(false);
const showSaveWorkspace = ref(false);
const workspaceName = ref("");
const workspacelist = ref([]);
const workspaceInited = ref(false);
const enableKeyDownEventInBlockCanvas = computed(() => {
  return (
    !showMask.value &&
    !showWelcome.value &&
    !showSelectWorkspace.value &&
    !showSaveWorkspace.value
  );
});
const showWelcomeLoadingPage = computed(() => {
  if (welcomeMaskRef.value) {
    return welcomeMaskRef.value.showLoading;
  } else {
    return false;
  }
});

provide("blockCanvasRef", blockCanvasRef);
provide("clearWorkspaceValid", clearWorkspaceValid);
provide("scale", scale);

async function emitLoadWorkspace() {
  workspacelist.value = await window.ipcApi.getWorkspaceList();
  showSelectWorkspace.value = true;
}

async function emitSaveWorkspace() {
  showSaveWorkspace.value = true;
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

async function saveWorkspace(name) {
  let workspace_conf = JSON.stringify(blockCanvasRef.value.getWorkspace());
  let loading = null;
  try {
    // 处理保存逻辑
    loading = ElLoading.service({
      lock: true,
      customClass: "default-loading",
      text: "正在保存组态...",
      background: "rgba(255, 255, 255, 0.7)",
    });
    const res = await window.ipcApi.saveWorkspace(workspace_conf, name);
    workspaceName.value = name;
    ElNotification({
      title: "保存成功",
      showClose: false,
      message: `组态【${name}】已成功保存`,
      type: "success",
      duration: 3000,
      customClass: "default-notification",
    });
    showSaveWorkspace.value = false;
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

async function emitConvertWorkspace() {
  autoSaveWorkspace();
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
    await window.ipcApi.openDirectory(save_dir);
    if (data.data.success) {
      loading?.close();
      ElNotification({
        title: "代码已生成！",
        showClose: false,
        message: `IEC61499代码已保存到 ${save_dir}`,
        type: "success",
        duration: 3000,
        customClass: "default-notification",
      });
      await uploadToFBB(save_dir);
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
    loading?.close();
  }
}

async function uploadToFBB(folderPath) {
  let loading = null;
  try {
    await ElMessageBox.confirm(
      "检测到FBB运行中！是否要将生成的组态上传到FBB IDE？",
      "提示",
      {
        confirmButtonText: "上传",
        cancelButtonText: "取消",
        type: "info",
        icon: markRaw(UploadFilled),
        showClose: false,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        cancelButtonClass: "cancel-btn",
        confirmButtonClass: "positive-confirm-btn",
        customClass: "clear-workspace-dialog",
      }
    );
    loading = ElLoading.service({
      lock: true,
      customClass: "default-loading",
      text: "正在上传代码...",
      background: "rgba(255, 255, 255, 0.7)",
    });
    const files_raw = await window.ipcApi.uploadToFBB(folderPath);
    const file_list = files_raw.map((fileRaw) => {
      return {
        filename: fileRaw.filename,
        file: new Blob([fileRaw.contentBuffer], {
          type: fileRaw.mimeType,
        }),
      };
    });
    let state_code_list = [];
    for (const file of file_list) {
      const formData = new FormData();
      formData.append(file.filename, file.file);
      const response = await FBB_service.post("/import", formData);
      state_code_list.push(response.data.code);
    }
    const success_cnt = state_code_list.filter((code) => code === 1).length;
    if (success_cnt !== file_list.length) {
      ElNotification({
        title: "上传部分文件失败",
        showClose: false,
        message: `成功上传 ${success_cnt} / ${file_list.length} 个文件，请检查FBB IDE日志`,
        type: "warning",
        duration: 3000,
        customClass: "default-notification",
      });
    } else {
      ElNotification({
        title: "上传成功",
        showClose: false,
        message: `已成功上传所有文件到FBB IDE`,
        type: "success",
        duration: 3000,
        customClass: "default-notification",
      });
    }
  } catch (error) {
    if (error === "cancel") {
      return;
    }
    let errorMessage = window.ipcApi.extractErrorMessage(error);
    ElNotification({
      title: "上传失败",
      showClose: false,
      message: `${errorMessage || error}`,
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
  }
  loading?.close();
}

async function projectCreated() {
  showWelcome.value = false;
  showMask.value = true;
  let loadRes = await blockCanvasRef.value.initWorkspace();
  showMask.value = false;
  if (!loadRes) {
    ElNotification({
      title: "初始化工作区失败",
      showClose: false,
      message: "请检查配置文件是否正确",
      type: "error",
      duration: 3000,
      customClass: "default-notification",
    });
    showWelcome.value = true;
    return;
  } else {
    workspaceInited.value = true;
    await autoLoadWorkspace();
    ElNotification({
      title: "欢迎使用",
      showClose: false,
      message: "欢迎使用本系统，祝您工作愉快！",
      type: "success",
      duration: 3000,
      customClass: "default-notification",
    });
  }
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

async function autoSaveWorkspace() {
  if (blockCanvasRef.value?.hasPlacedBlocks()) {
    // const now = new Date();
    // const timestamp = `_${now.getFullYear().toString().slice(-2)}${(
    //   now.getMonth() + 1
    // )
    //   .toString()
    //   .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
    //   .getHours()
    //   .toString()
    //   .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
    //   .getSeconds()
    //   .toString()
    //   .padStart(2, "0")}`;
    saveWorkspace("[自动保存]");
  }
}

async function autoLoadWorkspace() {
  workspacelist.value = await window.ipcApi.getWorkspaceList();
  if (workspacelist.value.includes("[自动保存]")) {
    // 如果存在自动保存的工作区，则加载它
    await loadWorkspaceSelected("[自动保存]");
  }
}

provide("autoSaveWorkspace", autoSaveWorkspace);
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
  z-index: 200;
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
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
  transform: translateY(-100px) scale(1.5);
}

.welcome-fade-enter-to,
.welcome-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.select-workspace-fade-enter-active,
.select-workspace-fade-leave-active {
  transition: opacity 0.1s ease-in-out;
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

.home-icon {
  height: 100%;
}

.home-icon-btn {
  height: calc(100% - 20px);
  width: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 20px;
}

.home-icon-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.background img {
  height: 100%;
  object-fit: cover;
  filter: opacity(0.1) blur(4px);
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  pointer-events: none;
}
</style>
