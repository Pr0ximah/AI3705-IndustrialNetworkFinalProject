<template>
  <div
    :style="blockStyle"
    @mousedown="handleMouseDown"
    @click.stop="handleClick"
    @dblclick.stop="handleDoubleClick"
    class="drag-block"
    :class="blockClasses"
  >
    <!-- 左侧接口区域 -->
    <div class="connector-region left-connector-region">
      <div class="connector-group">
        <div
          class="connector signal-connector"
          v-for="(signal, signalIndex) in block.categoryConf.signal_input"
          :key="signal.name"
          :class="getConnectorClasses('signal_input', signalIndex)"
          @mousedown.stop="
            handleConnectorMouseDown('signal_input', signalIndex, $event)
          "
          @mouseup.stop="
            handleConnectorMouseUp('signal_input', signalIndex, $event)
          "
        />
      </div>
      <div class="connector-group">
        <div
          class="connector var-connector"
          v-for="(variable, varIndex) in block.categoryConf.var_input"
          :key="variable.name"
          :class="getConnectorClasses('var_input', varIndex)"
          @mousedown.stop="
            handleConnectorMouseDown('var_input', varIndex, $event)
          "
          @mouseup.stop="handleConnectorMouseUp('var_input', varIndex, $event)"
        />
      </div>
    </div>

    <!-- 右侧接口区域 -->
    <div class="connector-region right-connector-region">
      <div class="connector-group">
        <div
          class="connector signal-connector"
          v-for="(signal, signalIndex) in block.categoryConf.signal_output"
          :key="signal.name"
          :class="getConnectorClasses('signal_output', signalIndex)"
          @mousedown.stop="
            handleConnectorMouseDown('signal_output', signalIndex, $event)
          "
          @mouseup.stop="
            handleConnectorMouseUp('signal_output', signalIndex, $event)
          "
        />
      </div>
      <div class="connector-group">
        <div
          class="connector var-connector"
          v-for="(variable, varIndex) in block.categoryConf.var_output"
          :key="variable.name"
          :class="getConnectorClasses('var_output', varIndex)"
          @mousedown.stop="
            handleConnectorMouseDown('var_output', varIndex, $event)
          "
          @mouseup.stop="handleConnectorMouseUp('var_output', varIndex, $event)"
        />
      </div>
    </div>

    <img :src="block.getCategoryIcon()" class="icon" draggable="false" />
    {{ block.getCategoryName() }}
  </div>
</template>

<script setup>
import { computed, inject, defineProps, defineEmits } from "vue";

const props = defineProps({
  block: {
    type: Object,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  isDragging: {
    type: Boolean,
    default: false,
  },
  isInSelectedGroup: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "mousedown",
  "click",
  "double-click",
  "connector-mousedown",
  "connector-mouseup",
]);

// 注入连接器状态检查函数
const isConnectorActive = inject("isConnectorActive", () => false);
const isConnectorConnected = inject("isConnectorConnected", () => false);
const isConnectorSnapped = inject("isConnectorSnapped", () => false);
const isConnectorNearby = inject("isConnectorNearby", () => false);

// 计算块的样式
const blockStyle = computed(() => {
  const baseStyle = {
    width: props.block.width + "px",
    height: props.block.height + "px",
    backgroundColor: props.block.color,
    cursor: props.isDragging ? "grabbing" : "grab",
  };

  // 如果是已放置的块，添加绝对定位
  if (props.block.place_state === "placed") {
    baseStyle.left = props.block.x + "px";
    baseStyle.top = props.block.y + "px";
    baseStyle.position = "absolute";
    baseStyle.zIndex = props.isDragging ? 10 : -1;
  }

  return baseStyle;
});

// 计算块的CSS类
const blockClasses = computed(() => ({
  selected: props.isSelected || props.isInSelectedGroup,
  dragging: props.isDragging,
}));

// 获取连接器的CSS类
const getConnectorClasses = (type, index) => ({
  active: isConnectorActive(props.block, type, index),
  connected: isConnectorConnected(props.block, type, index),
  snapped:
    isConnectorSnapped(props.block, type, index) ||
    isConnectorNearby(props.block, type, index),
});

// 事件处理函数
const handleMouseDown = (event) => {
  emit("mousedown", props.block, event);
};

const handleClick = (event) => {
  emit("click", props.block, event);
};

const handleDoubleClick = (event) => {
  emit("double-click", props.block, event);
};

const handleConnectorMouseDown = (type, index, event) => {
  emit("connector-mousedown", props.block, type, index, event);
};

const handleConnectorMouseUp = (type, index, event) => {
  emit("connector-mouseup", props.block, type, index, event);
};
</script>

<style scoped>
.drag-block {
  border-radius: 8px;
  user-select: none;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-weight: 600;
  font-size: small;
  transition: box-shadow 0.2s;
  border: 1px solid var(--color-dark-0);
}

.drag-block:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.drag-block.selected {
  border-color: #409eff;
  box-shadow: 0 0 2px 3px rgba(0, 115, 230, 0.45);
}

.drag-block.dragging {
  opacity: 0.8;
  box-shadow: 0 0 5px 3px rgba(0, 0, 0, 0.3);
}

.drag-block .icon {
  width: 40px;
  height: 40px;
  margin-top: 5px;
  margin-bottom: 5px;
}

.signal-connector {
  background-color: #ff6b6b;
}

.var-connector {
  background-color: #4ecdc4;
}

.connector:hover {
  transform: scale(1.2);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.signal-connector.active {
  background-color: #ffd93d;
  border-color: #ff6b35;
  box-shadow: 0 0 6px rgba(255, 107, 53, 0.6);
}

.signal-connector.snapped {
  background-color: #ff9800;
  border-color: #f57c00;
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.8);
  transform: scale(1.3);
}

.var-connector.active {
  background-color: #81c784;
  border-color: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
}

.var-connector.snapped {
  background-color: #66bb6a;
  border-color: #388e3c;
  box-shadow: 0 0 8px rgba(102, 187, 106, 0.8);
  transform: scale(1.3);
}

.icon {
  width: 20px;
  height: 20px;
  margin-right: 4px;
}
</style>
