<template>
  <div class="loading-main">
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
        :percentage="pregress"
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
import { ref, defineExpose, computed } from "vue";
import { ElProgress } from "element-plus";

const pregress = ref(0);
const progressColor = "#3e4491";
const maxVisibleMessages = 10;
let messageIdCounter = 0;
const messages = ref([]); // 改为响应式

// 计算可见的消息，只显示最新的几条
const visibleMessages = computed(() => {
  if (messages.value.length <= maxVisibleMessages) {
    return messages.value;
  }
  return messages.value.slice(-maxVisibleMessages);
});

defineExpose({
  updateProgress(percentage) {
    pregress.value = percentage;
  },
  resetMsg() {
    messages.value = []; // 清空消息列表
    pregress.value = 0; // 重置进度
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
</style>
