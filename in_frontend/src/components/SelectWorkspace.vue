<template>
  <div class="main">
    <div class="wrapper">
      <div class="title">加载组态</div>
      <div style="flex: 1; width: 100%">
        <ElSelect v-model="selectedWorkspace" placeholder="选择要加载的组态名">
          <ElOption
            v-for="workspace in workspaces"
            :key="workspace"
            :label="workspace"
            :value="workspace"
          />
        </ElSelect>
      </div>
      <div class="buttons">
        <button @click="emit('close')">取消</button>
        <button @click="emit('select', selectedWorkspace)" class="fill">
          加载
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from "vue";
import { ElOption, ElSelect } from "element-plus";
const selectedWorkspace = ref(null);
const emit = defineEmits(["close", "select"]);
defineProps({
  workspaces: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.title {
  font-size: x-large;
  color: var(--color-dark-0);
  font-weight: bold;
  width: 100%;
  margin-bottom: 20px;
}

.wrapper {
  width: 400px;
  height: 250px;
  background-color: white;
  border-radius: 10px;
  border: 2px solid var(--color-dark-0);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.el-select {
  width: 70%;
}

.buttons {
  width: 100%;
  height: 40px;
  display: flex;
  justify-self: flex-end;
  gap: 10px;
}

button {
  flex: 1;
  height: 40px;
  background-color: white;
  border-radius: 6px;
  font-weight: 600;
  border: 1px solid var(--color-dark-0);
  letter-spacing: 2px;
  transition: background-color 0.15s ease;
}

button.fill {
  background-color: var(--color-dark-0);
  color: white;
}

button:hover {
  background-color: #f0f0f0;
  cursor: pointer;
}

button.fill:hover {
  background-color: var(--color-dark-2);
}
</style>
