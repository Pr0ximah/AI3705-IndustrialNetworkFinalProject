<template>
  <div class="loading-main">
    <div class="loading-logo">
      <img src="/logo.png" />
      <ElIcon v-if="props.LLM_Display"><CloseBold /></ElIcon>
      <div class="LLM-display" v-if="props.LLM_Display">
        <img :src="props.LLM_Display.icon" class="model-icon" />
      </div>
    </div>
    <TransitionGroup
      name="message"
      tag="div"
      appear
      @enter="onMessageEnter"
      @after-enter="onMessageAfterEnter"
    >
      <ElProgress
        key="progress"
        type="circle"
        class="loading-progress"
        :color="progressColor"
        :percentage="progress"
        :width="200"
        :stroke-width="20"
      />
      <div
        v-for="message in visibleMessages"
        :key="message.id"
        class="message-itm"
      >
        {{ message.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, defineExpose, computed, defineProps } from "vue";
import { ElIcon, ElProgress } from "element-plus";
import { CloseBold } from "@element-plus/icons-vue";

const progress = ref(0);
const progressColor = "#3e4491";
const maxVisibleMessages = 8;
let messageIdCounter = 0;
const messages = ref([]); // 改为响应式
const props = defineProps({
  LLM_Display: {
    type: Object,
    default: null,
  },
});

// 计算可见的消息，只显示最新的几条
const visibleMessages = computed(() => {
  if (messages.value.length <= maxVisibleMessages) {
    return messages.value;
  }
  return messages.value.slice(-maxVisibleMessages);
});

defineExpose({
  updateProgress(percentage) {
    progress.value = percentage;
  },
  resetMsg() {
    messages.value = []; // 清空消息列表
    progress.value = 0; // 重置进度
    messageIdCounter = 0; // 重置消息ID计数器
  },
  addMsg(message, replace = false) {
    const newMessage = {
      id: messageIdCounter++,
      text: message,
    };
    if (replace && messages.value.length > 0) {
      messages.value[messages.value.length - 1] = newMessage; // 修复替换逻辑
    } else {
      messages.value.push(newMessage); // 添加新消息
    }
    console.log(visibleMessages.value);
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
  color: var(--color-dark-1);
  font-weight: 600;
  font-size: 25px;
  text-align: center;
}

.loading-progress {
  font-weight: 600;
  margin-bottom: 40px;
}

/* TransitionGroup 生成的容器样式 */
.loading-main > div {
  width: 100%;
}

.message-itm {
  width: 100%;
  text-align: center;
  margin: 10px 0;
  opacity: 1;
  transition: opacity 0.3s ease;
}

/* 为旧消息添加渐变透明度 */
.message-itm:nth-last-child(10) {
  opacity: 0.6;
}

.message-itm:nth-last-child(9) {
  opacity: 0.8;
}

/* 消息进入动画 */
.message-enter-active {
  transition: all 0.5s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.message-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* 消息移动动画 */
.message-move {
  transition: transform 0.3s ease;
}

/* 消息离开动画 */
.message-leave-active {
  transition: all 0.3s ease;
  position: absolute;
}

.message-leave-to {
  opacity: 0;
}

.loading-logo {
  width: 100%;
  height: 40px;
  position: absolute;
  top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.loading-logo svg {
  height: 100%;
}

.loading-logo img {
  height: 100%;
}

.loading-logo .el-icon {
  height: 100%;
}

.LLM-display {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 10px;
}

.model-icon {
  height: 100%;
}
</style>
