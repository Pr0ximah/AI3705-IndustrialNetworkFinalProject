<template>
  <div class="loading-main">
    <ElProgress
      type="circle"
      class="loading-progress"
      :color="progressColor"
      :percentage="pregress"
      :width="200"
      :stroke-width="20"
    />
    <div class="loading-text">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message-itm"
        :style="{ animationDelay: `${index * 0.2}s` }"
      >
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineExpose } from "vue";
import { ElProgress } from "element-plus";
const pregress = ref(0); // Initial percentage
const progressColor = "#3e4491"; // Default color
defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
});
defineExpose({
  updateProgress(percentage) {
    pregress.value = percentage;
  },
});
</script>

<style scoped>
.loading-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.loading-progress {
  font-weight: 600;
  margin-bottom: 40px;
}

.loading-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--color-dark-1);
  font-weight: 600;
  font-size: 25px;
}

.message-item {
  margin: 6px 0;
  animation: slideIn 0.5s ease forwards;
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
