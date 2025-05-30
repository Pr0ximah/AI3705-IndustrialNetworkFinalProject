<template>
  <WindowControl
    :showMinimize="false"
    :showMaximize="false"
    windowName="block-editor"
    class="block-editor-window-control"
  />
  <div class="block-editor-view">
    <div class="editor-container">
      <BlockEditor />
    </div>
    <div class="preview-container">
      <BlockPreview />
    </div>
  </div>
</template>

<script setup>
import WindowControl from "@/components/WindowControl.vue";
import { ref, onMounted } from "vue";

const blockID = ref(null);

onMounted(() => {
  blockID.value = window.ipcApi.getBlockId();
  console.log("Block ID:", blockID.value);
});
</script>

<style scoped>
.block-editor-window-control {
  position: absolute;
  top: 10px;
  right: 2px;
  z-index: 1000;
}
</style>
