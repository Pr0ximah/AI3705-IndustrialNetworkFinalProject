<template>
  <div class="main">
    <div class="wrapper">
      <div class="title">保存组态</div>
      <div class="input">
        <ElInput
          size="large"
          v-model="workspaceName"
          placeholder="输入组态名"
          @keydown="
            (event) => {
              if (event.key === 'Enter') {
                emitSave();
              }
            }
          "
          type="text"
        />
      </div>
      <div class="buttons">
        <button @click="emit('close')">取消</button>
        <button @click="emitSave" class="fill">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits } from "vue";
import { ElInput, ElNotification } from "element-plus";
const workspaceName = ref("");
const emit = defineEmits(["close", "select"]);

function emitSave() {
  if (workspaceName.value.trim() === "") {
    ElNotification({
      title: "提示",
      showClose: false,
      message: "组态名不能为空",
      type: "warning",
      duration: 3000,
      customClass: "default-notification",
    });
    return;
  }
  emit("select", workspaceName.value);
}
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
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
  margin-bottom: 30px;
}

.input {
  flex: 1;
  width: 90%;
  font-size: large;
  margin-bottom: 30px;
}

.wrapper {
  width: 400px;
  background-color: white;
  border-radius: 10px;
  border: 1px solid var(--color-dark-1);
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
  width: 35%;
  height: 35px;
  display: flex;
  justify-self: flex-end;
  align-self: flex-end;
  gap: 15px;
}

button {
  flex: 1;
  height: 100%;
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
