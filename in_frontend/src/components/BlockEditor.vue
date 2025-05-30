<template>
  <div class="block-editor">blockeditor</div>
</template>

<script setup>
import { onMounted, ref } from "vue";
const currentCategoryId = window.ipcApi.getProcessArgv("category-id");
const categoryConf = ref(null);

onMounted(() => {
  window.ipcApi.loadBlockCategoryById(currentCategoryId).then((data) => {
    categoryConf.value = JSON.parse(data);
    console.log("categoryConf", categoryConf.value);
  });
});
</script>
