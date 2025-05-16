<template>
  <ElContainer class="home-container">
    <ElHeader class="container-header">
      <div>Home</div>
      <div class="canvas-controls">
        <button @click="resetCanvas">
          重置视图
          <House class="icon" />
        </button>
        <button @click="zoomIn">
          放大
          <Plus class="icon" />
        </button>
        <button @click="zoomOut">
          缩小
          <Minus class="icon" />
        </button>
        <button
          :class="[placedBlocks.length > 0 ? 'valid' : 'invalid']"
          @click="clearWorkspace"
          class="clear-btn"
        >
          清空工作区
          <Delete class="icon" />
        </button>
        <span style="font-size: 15px; padding: 0 10px"
          >缩放: {{ Math.round(scale * 100) }}%</span
        >
      </div>
    </ElHeader>

    <!-- ElMain 作为 drop zone -->
    <ElMain
      @mouseup="onMouseUp"
      @mousemove="onMouseMove"
      @mousedown="onMouseDown"
      @wheel="onWheel"
      @mouseleave="onMouseLeave"
      class="container-main"
      style="position: relative; overflow: hidden"
    >
      <div class="home-aside" style="position: relative">
        <!-- 侧边栏 -->
        <div
          v-for="(block, index) in originalBlocks"
          :key="'block-' + index"
          :style="{
            width: block.width + 'px',
            height: block.height + 'px',
            backgroundColor: block.color,
            cursor: draggingBlock === block ? 'grabbing' : 'grab',
          }"
          @mousedown="startDrag(block, $event)"
          @click.stop="selectBlock(block, $event)"
          class="drag-block"
          :class="{
            snap: isSnapped && draggingBlock === block,
            selected: selectedBlock === block,
          }"
          :id="'block-' + block.category"
        ></div>
      </div>

      <!-- 可拖拽块的容器 -->
      <div ref="canvasContainerRef" class="canvas-container">
        <div
          class="canvas-content"
          :style="[
            canvasStyle,
            {
              'background-size': gridSize + 'px ' + gridSize + 'px',
              width: canvasWidth + 'px',
              height: canvasHeight + 'px',
            },
          ]"
          @click="clearSelection"
        >
          <!-- 所有可拖拽的块统一渲染 -->
          <div
            v-for="(block, index) in placedBlocks"
            :key="'block-' + index"
            :style="{
              left: block.x + 'px',
              top: block.y + 'px',
              width: block.width + 'px',
              height: block.height + 'px',
              backgroundColor: block.color,
              position: 'absolute',
              cursor: draggingBlock === block ? 'grabbing' : 'grab',
              zIndex:
                draggingBlock === block ? 2 : selectedBlock === block ? 1 : 0,
              transition: isSnapped ? 'all 0.05s' : 'none',
            }"
            @mousedown="startDrag(block, $event)"
            @click.stop="selectBlock(block, $event)"
            class="drag-block"
            :class="{
              snap: isSnapped && draggingBlock === block,
              selected: selectedBlock === block,
              dragging: draggingBlock === block,
            }"
            :id="'block-' + block.category"
          ></div>
        </div>
      </div>
    </ElMain>
  </ElContainer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, markRaw } from "vue";
import { ElContainer, ElHeader, ElMain, ElMessageBox } from "element-plus";
import { Delete, Plus, Minus, House } from "@element-plus/icons-vue";

// 可拖动块的放置状态
const BLOCK_PLACE_STATE = {
  original: "original",
  placed: "placed",
};

// 块原始参数
const BLOCK_PARAMS = {
  width: 120,
  height: 80,
};

// 网格大小
const gridSize = 20;

// 吸附参数
const snap_threshold = 30; // 吸附阈值
const snap_spacing = gridSize; // 吸附间距

// 画布尺寸常量
const canvasWidth = 1000;
const canvasHeight = 1000;

// 画布状态
const scale = ref(1); // 缩放比例
const offsetX = ref(0); // X轴偏移
const offsetY = ref(0); // Y轴偏移
const isPanning = ref(false); // 是否正在平移画布
const lastMouseX = ref(0); // 上次鼠标X位置
const lastMouseY = ref(0); // 上次鼠标Y位置

// 画布样式计算属性
const canvasStyle = computed(() => {
  return {
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
  };
});

// 创建块的函数
function createBlock(x, y, place_state, category = "1") {
  return {
    x: x,
    y: y,
    width: BLOCK_PARAMS.width,
    height: BLOCK_PARAMS.height,
    category: category,
    place_state: place_state,
  };
}

// 原始块
const originalBlocks = [
  createBlock(0, 0, BLOCK_PLACE_STATE.original, "1"),
  createBlock(0, 0, BLOCK_PLACE_STATE.original, "2"),
  createBlock(0, 0, BLOCK_PLACE_STATE.original, "3"),
];

// 已放置的块
const placedBlocks = ref([]);

// 合并所有块
const allBlocks = computed(() => [...originalBlocks, ...placedBlocks.value]);

// 当前正在拖动的块
const draggingBlock = ref(null);

// 当前选中的块
const selectedBlock = ref(null);

// 是否触发了吸附
const isSnapped = ref(false);

// 画布容器引用
const canvasContainerRef = ref(null);

// 检查并限制画布位置在可视区域内
function checkBoundaries() {
  // 限制左上方不超出边界（不显示空白区域）
  offsetX.value = Math.min(0, offsetX.value);
  offsetY.value = Math.min(0, offsetY.value);

  // 获取画布容器尺寸
  if (canvasContainerRef.value) {
    const containerWidth = canvasContainerRef.value.clientWidth;
    const containerHeight = canvasContainerRef.value.clientHeight;

    // 计算缩放后的最小允许偏移量（确保右侧和底部不会出现空白）
    const minOffsetX = Math.min(0, containerWidth - canvasWidth * scale.value);
    const minOffsetY = Math.min(
      0,
      containerHeight - canvasHeight * scale.value
    );

    offsetX.value = Math.max(minOffsetX, offsetX.value);
    offsetY.value = Math.max(minOffsetY, offsetY.value);
  }
}

// 重置画布到初始状态
function resetCanvas() {
  scale.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
}

// 统一的缩放函数
function zoom(zoomFactor, centerX, centerY) {
  // 计算最小缩放比例
  const containerWidth = canvasContainerRef.value
    ? canvasContainerRef.value.clientWidth
    : window.innerWidth;
  const containerHeight = canvasContainerRef.value
    ? canvasContainerRef.value.clientHeight
    : window.innerHeight;

  const minScaleX = containerWidth / canvasWidth;
  const minScaleY = containerHeight / canvasHeight;
  const minScale = Math.min(minScaleX, minScaleY);

  // 限制最大缩放比例
  const maxScale = 2.0;
  const newScale = Math.max(
    minScale,
    Math.min(maxScale, scale.value + zoomFactor)
  );

  if (scale.value !== newScale) {
    // 计算中心点相对于画布的位置
    const centerXInCanvas = (centerX - offsetX.value) / scale.value;
    const centerYInCanvas = (centerY - offsetY.value) / scale.value;

    // 更新缩放值和偏移量
    scale.value = newScale;
    offsetX.value = centerX - centerXInCanvas * newScale;
    offsetY.value = centerY - centerYInCanvas * newScale;

    // 检查边界
    checkBoundaries();
  }
}

// 缩放按钮处理函数
function zoomIn() {
  // 使用屏幕中心作为缩放中心点
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  zoom(0.1, centerX, centerY);
}

function zoomOut() {
  // 使用屏幕中心作为缩放中心点
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  zoom(-0.1, centerX, centerY);
}

// 清空工作区函数
function clearWorkspace() {
  // 显示确认对话框
  if (placedBlocks.value.length > 0) {
    ElMessageBox.confirm("确定要清空工作区吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
      icon: markRaw(Delete),
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      cancelButtonClass: "cancel-btn",
      confirmButtonClass: "confirm-btn",
      customClass: "clear-workspace-dialog",
    })
      .then(() => {
        // 清空已放置的块
        placedBlocks.value = [];
        // 清除选中状态
        selectedBlock.value = null;
      })
      .catch(() => {
        // 取消操作
      });
  }
}

// 处理鼠标滚轮事件
function onWheel(event) {
  event.preventDefault();

  // 根据滚轮方向决定缩放因子
  const zoomFactor = event.deltaY < 0 ? 0.025 : -0.025;

  // 使用鼠标位置作为缩放中心点
  zoom(zoomFactor, event.clientX, event.clientY);
}

// 检查鼠标是否位于任何块上
function isMouseOverBlock(event) {
  for (const block of allBlocks.value) {
    // 计算块的真实位置（考虑缩放和偏移）
    let blockX, blockY;
    if (block.place_state === BLOCK_PLACE_STATE.original) {
      // 原始块在侧边栏，不受画布变换影响
      blockX = block.x;
      blockY = block.y;
    } else {
      // 画布中的块需要考虑画布变换
      blockX = block.x * scale.value + offsetX.value;
      blockY = block.y * scale.value + offsetY.value;
    }

    // 获取块的实际宽高（考虑缩放）
    const blockWidth =
      block.width *
      (block.place_state === BLOCK_PLACE_STATE.placed ? scale.value : 1);
    const blockHeight =
      block.height *
      (block.place_state === BLOCK_PLACE_STATE.placed ? scale.value : 1);

    // 检查鼠标是否在块的范围内
    if (
      event.clientX >= blockX &&
      event.clientX <= blockX + blockWidth &&
      event.clientY >= blockY &&
      event.clientY <= blockY + blockHeight
    ) {
      return true;
    }
  }
  return false;
}

// 鼠标按下事件
function onMouseDown(event) {
  // 中键按下始终为平移
  if (event.button === 1) {
    isPanning.value = true;
    lastMouseX.value = event.clientX;
    lastMouseY.value = event.clientY;
    event.preventDefault();
    return;
  }

  // 左键按下
  if (event.button === 0) {
    // 如果点击画布空白区域，清除选中
    if (!isMouseOverBlock(event)) {
      selectedBlock.value = null;

      // 如果按住Shift键，则开始平移画布
      if (event.shiftKey) {
        isPanning.value = true;
        lastMouseX.value = event.clientX;
        lastMouseY.value = event.clientY;
        event.preventDefault();
      }
    }
    // 否则让块的mousedown事件处理（会触发startDrag）
  }
}

// 选中块
function selectBlock(block, event) {
  // 阻止事件冒泡，防止触发画布的click事件
  event.stopPropagation();
  selectedBlock.value = block;
}

// 清除选中
function clearSelection() {
  selectedBlock.value = null;
}

function startDrag(block, event) {
  // 如果正在平移画布，不启动拖拽
  if (isPanning.value) return;

  // 只有左键点击才触发拖拽
  if (event.button !== 0) return;

  if (block.place_state === BLOCK_PLACE_STATE.original) {
    // 计算鼠标在画布坐标系中的位置（考虑缩放和偏移）
    const rect = canvasContainerRef.value.getBoundingClientRect();
    let mouseX = (event.clientX - rect.left - offsetX.value) / scale.value;
    let mouseY = (event.clientY - rect.top - offsetY.value) / scale.value;
    const newBlock = createBlock(
      mouseX,
      mouseY,
      BLOCK_PLACE_STATE.placed,
      block.category
    );
    placedBlocks.value.push(newBlock);
    draggingBlock.value = newBlock;
    selectedBlock.value = newBlock; // 选中新的块
  } else {
    draggingBlock.value = block;
    selectedBlock.value = block; // 选中正在拖拽的块
  }
  event.stopPropagation(); // 防止触发画布拖拽
}

function calCenter(corner_x, corner_y) {
  return {
    x: corner_x + BLOCK_PARAMS.width / 2,
    y: corner_y + BLOCK_PARAMS.height / 2,
  };
}

// 检查移动是否合法（不重叠且不出界）
function isMoveValid(targetX, targetY, currentBlock, checkOverlap = true) {
  // 检查是否出界
  if (
    targetX < 0 ||
    targetY < 0 ||
    targetX + BLOCK_PARAMS.width > canvasWidth ||
    targetY + BLOCK_PARAMS.height > canvasHeight
  ) {
    return false;
  }

  if (!checkOverlap) {
    return true; // 如果不检查重叠，直接返回合法
  }

  // 检查是否与其他块重叠
  for (const block of allBlocks.value) {
    // 跳过自己和原始块
    if (
      block === currentBlock ||
      block.place_state === BLOCK_PLACE_STATE.original
    ) {
      continue;
    }

    // 检查是否重叠
    if (
      targetX < block.x + BLOCK_PARAMS.width &&
      targetX + BLOCK_PARAMS.width > block.x &&
      targetY < block.y + BLOCK_PARAMS.height &&
      targetY + BLOCK_PARAMS.height > block.y
    ) {
      return false;
    }
  }

  // 通过所有检查，移动合法
  return true;
}

function onMouseMove(event) {
  // 处理画布平移
  if (isPanning.value) {
    const dx = event.clientX - lastMouseX.value;
    const dy = event.clientY - lastMouseY.value;

    offsetX.value += dx;
    offsetY.value += dy;

    // 检查边界
    checkBoundaries();

    lastMouseX.value = event.clientX;
    lastMouseY.value = event.clientY;
    return;
  }

  // 处理块拖拽
  if (!draggingBlock.value) return;

  const rect = canvasContainerRef.value.getBoundingClientRect();

  // 计算鼠标在画布坐标系中的位置（考虑缩放和偏移）
  let mouseX = (event.clientX - rect.left - offsetX.value) / scale.value;
  let mouseY = (event.clientY - rect.top - offsetY.value) / scale.value;

  // 初始坐标（带网格吸附）
  let newX =
    Math.round((mouseX - BLOCK_PARAMS.width / 2) / gridSize) * gridSize;
  let newY =
    Math.round((mouseY - BLOCK_PARAMS.height / 2) / gridSize) * gridSize;

  // 限制拖动边界，确保块不会超出画布
  newX = Math.max(0, Math.min(canvasWidth - BLOCK_PARAMS.width, newX));
  newY = Math.max(0, Math.min(canvasHeight - BLOCK_PARAMS.height, newY));

  // 检查初始移动位置是否合法
  let initialMoveValid = isMoveValid(newX, newY, draggingBlock.value, false);

  isSnapped.value = false;

  let finalX = newX;
  let finalY = newY;

  // 只有初始位置合法时才尝试吸附
  if (initialMoveValid) {
    let draggingBlockCenter = calCenter(finalX, finalY);
    let snapBlockList = [];

    for (const otherBlock of allBlocks.value) {
      if (otherBlock === draggingBlock.value) continue; // 自己不吸附
      if (otherBlock.place_state === BLOCK_PLACE_STATE.original) continue; // 原始块不参与吸附

      // 计算距离
      const otherBlockCenter = calCenter(otherBlock.x, otherBlock.y);
      const diffVec = [
        draggingBlockCenter.x - otherBlockCenter.x,
        draggingBlockCenter.y - otherBlockCenter.y,
      ];

      let potentialFinalX = finalX;
      let potentialFinalY = finalY;
      let willSnap = false;

      if (
        Math.abs(diffVec[0]) < BLOCK_PARAMS.width + snap_threshold &&
        Math.abs(diffVec[1]) < BLOCK_PARAMS.height + snap_threshold
      ) {
        if (Math.abs(diffVec[0]) > Math.abs(diffVec[1])) {
          // 吸附到左或右
          if (diffVec[0] > 0) {
            potentialFinalX = otherBlock.x + BLOCK_PARAMS.width + snap_spacing;
          } else {
            potentialFinalX = otherBlock.x - BLOCK_PARAMS.width - snap_spacing;
          }
          potentialFinalY = otherBlock.y;
          willSnap = true;
        } else {
          // 吸附到上或下
          if (diffVec[1] > 0) {
            potentialFinalY = otherBlock.y + BLOCK_PARAMS.height + snap_spacing;
          } else {
            potentialFinalY = otherBlock.y - BLOCK_PARAMS.height - snap_spacing;
          }
          potentialFinalX = otherBlock.x;
          willSnap = true;
        }

        // 检查这个吸附位置是否会导致与任何其他块重叠
        let potentialMoveValid = isMoveValid(
          potentialFinalX,
          potentialFinalY,
          draggingBlock.value
        );

        if (willSnap && potentialMoveValid) {
          isSnapped.value = true;
          snapBlockList.push({
            actualDist: Math.sqrt(
              Math.pow(draggingBlockCenter.x - otherBlockCenter.x, 2) +
                Math.pow(draggingBlockCenter.y - otherBlockCenter.y, 2)
            ),
            finalX: potentialFinalX,
            finalY: potentialFinalY,
          });
        }
      }
    }

    // 选择距离最近的块
    let minDist = Number.MAX_VALUE;
    for (const snapBlock of snapBlockList) {
      if (snapBlock.actualDist < minDist) {
        minDist = snapBlock.actualDist;
        finalX = snapBlock.finalX;
        finalY = snapBlock.finalY;
      }
    }
  }

  // 最终检查确保移动合法
  if (isMoveValid(finalX, finalY, draggingBlock.value)) {
    // 更新块的位置
    draggingBlock.value.x = finalX;
    draggingBlock.value.y = finalY;
  }
}

function onMouseUp() {
  // 停止平移
  if (isPanning.value) {
    isPanning.value = false;
  }

  // 停止拖拽
  draggingBlock.value = null;
  isSnapped.value = false;
}

// 处理鼠标离开窗口事件
function onMouseLeave() {
  // 如果正在拖动或平移，自动取消操作
  if (isPanning.value || draggingBlock.value) {
    isPanning.value = false;
    draggingBlock.value = null;
    isSnapped.value = false;
  }
}

// 添加键盘事件处理函数
function handleKeyDown(event) {
  // 如果按下Delete或Backspace键，并且有选中的块
  if (
    (event.key === "Delete" || event.key === "Backspace") &&
    selectedBlock.value
  ) {
    // 只有已放置的块可以删除，原始模板不能删除
    if (selectedBlock.value.place_state === BLOCK_PLACE_STATE.placed) {
      // 从已放置块数组中移除选中的块
      const index = placedBlocks.value.findIndex(
        (block) => block === selectedBlock.value
      );
      if (index !== -1) {
        placedBlocks.value.splice(index, 1);
      }
      // 清除选中状态
      selectedBlock.value = null;
    }
  }
}

// 在组件挂载时添加键盘事件监听器
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

// 在组件卸载时移除键盘事件监听器
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.container-main {
  position: relative;
  overflow: hidden;
  flex: 1;
  padding: 0;
}

.canvas-content {
  /* 添加网格背景 */
  background-image: linear-gradient(
      to right,
      rgba(150, 150, 150, 0.2) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, rgba(150, 150, 150, 0.2) 1px, transparent 1px);
  background-color: white; /* 确保画布有背景颜色 */
  box-shadow: 0 0 2px gray;
}

/* 当平移时改变鼠标样式 */
.container-main:active {
  cursor: grabbing;
}

.canvas-container {
  width: 100%;
  height: 100%;
  flex: 1;
  z-index: 1;
  overflow: hidden;
}
</style>
