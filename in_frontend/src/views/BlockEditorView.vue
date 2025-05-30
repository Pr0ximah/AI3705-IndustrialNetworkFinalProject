<template>
  <WindowControl
    :showMinimize="false"
    :showMaximize="false"
    windowName="block-editor"
    class="block-editor-window-control"
  />
  <div class="block-editor-view">
    <BlockPreview />ƒ
    <BlockEditor />
  </div>
</template>

<script setup>
import WindowControl from "@/components/WindowControl.vue";
import BlockEditor from "@/components/BlockEditor.vue";
import BlockPreview from "@/components/BlockPreview.vue";
</script>

<style scoped>
.block-editor-window-control {
  position: absolute;
  top: 10px;
  right: 2px;
  z-index: 1000;
}
</style>
