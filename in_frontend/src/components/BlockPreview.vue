<template>
  <div class="block-preview">
    <DraggableBlock v-if="block" :block="block" />
    <!-- <button @click="emit('update:categoryConf', props.categoryConf)">
      Update Category Config
    </button> -->
  </div>
</template>

<script setup>
import { defineEmits, ref, onMounted, defineExpose } from "vue";
import { ElLoading } from "element-plus";
import DraggableBlock from "./DraggableBlock.vue";
import Block from "./Block";
const block = ref(null);

const emit = defineEmits(["update:categoryConf"]);
let loadingInstance = null;

onMounted(() => {
  loadingInstance = ElLoading.service({
    fullscreen: true,
    lock: true,
    customClass: "default-loading",
    text: "正在读取模型定义...",
    background: "rgba(255, 255, 255, 0.7)",
  });
});

function initBlock(categoryConf, currentCategoryId) {
  block.value = new Block(0, 0, null, categoryConf, currentCategoryId);
  loadingInstance.close();
}

defineExpose({
  initBlock,
});
</script>
