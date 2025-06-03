<template>
  <!-- <WindowControl
    :showMinimize="false"
    :showMaximize="false"
    windowName="block-editor"
    class="block-editor-window-control"
  /> -->
  <div class="block-editor-view">
    <BlockPreview
      ref="blockPreviewRef"
      :category-conf="categoryConf"
      :currentCategoryId="currentCategoryId"
      @update:category-conf="updateCategoryConf"
    />
    <BlockEditor
      ref="blockEditorRef"
      :category-conf="categoryConf"
      :currentCategoryId="currentCategoryId"
      @update:category-conf="updateCategoryConf"
    />
  </div>
</template>

<script setup>
// import WindowControl from "@/components/WindowControl.vue";
import BlockEditor from "@/components/BlockEditor.vue";
import BlockPreview from "@/components/BlockPreview.vue";
import { ElNotification } from "element-plus";
import { provide, ref, onMounted } from "vue";

const currentCategoryId = window.ipcApi.getProcessArgv("category-id");
const categoryConf = ref(null);

// 子组件引用
const blockPreviewRef = ref(null);
const blockEditorRef = ref(null);

// 更新 categoryConf 的方法
const updateCategoryConf = (newCategoryConf) => {
  categoryConf.value = newCategoryConf;
  // 调用子组件的初始化方法
  if (blockPreviewRef.value && blockPreviewRef.value.initBlock) {
    blockPreviewRef.value.initBlock(categoryConf.value, currentCategoryId);
  }
  if (blockEditorRef.value && blockEditorRef.value.initBlock) {
    blockEditorRef.value.initBlock(categoryConf.value, currentCategoryId);
  }
};

// 提供更新方法给子组件
provide("updateCategoryConf", updateCategoryConf);

onMounted(() => {
  window.ipcApi.send("open-block-editor-signal");
  window.ipcApi
    .loadBlockCategoryById(currentCategoryId)
    .then((data) => {
      categoryConf.value = data;

      // 数据加载完成后调用子组件初始化
      if (blockPreviewRef.value && blockPreviewRef.value.initBlock) {
        blockPreviewRef.value.initBlock(categoryConf.value, currentCategoryId);
      }
      if (blockEditorRef.value && blockEditorRef.value.initBlock) {
        blockEditorRef.value.initBlock(categoryConf.value, currentCategoryId);
      }
    })
    .catch((error) => {
      let errorMessage = window.ipcApi.extractErrorMessage(error);
      ElNotification({
        title: "加载失败",
        message: errorMessage,
        showClose: false,
        type: "error",
        duration: 1500,
        customClass: "default-notification",
      });
      setTimeout(() => {
        window.ipcApi.send("close-window", "block-editor");
      }, 1500);
    });
});

async function infoSave() {}
</script>

<style scoped>
.block-editor-window-control {
  position: absolute;
  top: 10px;
  right: 2px;
  z-index: 1000;
}

.block-editor-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
