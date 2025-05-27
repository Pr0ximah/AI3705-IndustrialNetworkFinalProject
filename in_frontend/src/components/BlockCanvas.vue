<template>
  <div
    @mouseup="onMouseUp"
    @mousemove="onMouseMove"
    @mousedown="onMouseDown"
    @wheel="onWheel"
    @mouseleave="onMouseLeave"
    :class="{ panning: isPanning }"
    class="main-container"
  >
    <div class="home-aside" :style="asideStyle">
      <!-- 侧边栏内容 -->
      <div
        v-for="(block, index) in originalBlocks"
        :key="'block-' + index"
        :style="{
          width: block.width + 'px',
          height: block.height + 'px',
          backgroundColor: block.color, // 假设 block.color 已定义
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
      >
        <img :src="block.getCategoryIcon()" class="icon" draggable="false" />
        {{ block.getCategoryName() }}
      </div>
    </div>

    <!-- 侧边栏切换按钮 -->
    <div
      class="aside-toggle-button"
      @click="toggleAside"
      :style="toggleButtonStyle"
    >
      <component
        :is="isAsideCollapsed ? DArrowRight : DArrowLeft"
        class="icon"
      />
    </div>

    <!-- 可拖拽块的容器 -->
    <div ref="canvasContainerRef" class="canvas-container">
      <div
        class="canvas-content"
        :style="[
          canvasStyle,
          {
            'background-size': GRID_SIZE + 'px ' + GRID_SIZE + 'px',
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
        >
          <img :src="block.getCategoryIcon()" class="icon" draggable="false" />
          {{ block.getCategoryName() }}
        </div>
      </div>
      <!-- 删除区域 -->
      <div
        v-if="draggingBlock"
        ref="deleteZoneRef"
        class="delete-zone"
        :class="{ active: isOverDelete }"
      >
        <Delete class="icon" />
        <span>拖拽到此处删除</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  markRaw,
  defineExpose,
} from "vue";
import { ElMessageBox } from "element-plus";
import { Delete, DArrowLeft, DArrowRight } from "@element-plus/icons-vue";
import shelf from "@/assets/shelf.svg";
import conveyor from "@/assets/conveyor.svg";
import lifter from "@/assets/lifter.svg";
import equipment from "@/assets/equipment.svg";
import transplanter from "@/assets/transplanter.svg";

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 50;
const SNAP_SPACING = GRID_SIZE;
const DRAG_THRESHOLD = 3; // 拖拽阈值：鼠标移动超过5像素才触发拖拽

// 动态画布尺寸
const canvasWidth = ref(2000); // 默认值
const canvasHeight = ref(2000); // 默认值

class Block {
  // 静态属性
  static PLACE_STATE = {
    original: "original",
    placed: "placed",
  };

  static PARAMS = {
    width: 120,
    height: 80,
  };

  // 可用的块类别配置
  static CATEGORIES = {
    1: {
      name: "货架",
      color: "#f9b4ab",
      icon: shelf,
    },
    2: {
      name: "输送机",
      color: "#fdebd3",
      icon: conveyor,
    },
    3: {
      name: "移栽机",
      color: "#48d6d2",
      icon: transplanter,
    },
    4: {
      name: "提升机",
      color: "#bbd4ce",
      icon: lifter,
    },
  };

  // 静态计数器用于生成唯一ID
  static _idCounter = 0;

  // 构造函数
  constructor(x, y, placeState, category = "1") {
    this.id = Block._generateUniqueId(); // 生成唯一ID
    this.x = x;
    this.y = y;
    this.width = Block.PARAMS.width;
    this.height = Block.PARAMS.height;
    this.category = category;
    this.place_state = placeState;
    this.color = this.getColorByCategory();

    // 连接信息：存储相邻块的ID
    this.connections = {
      top: null, // 上方连接的块ID
      bottom: null, // 下方连接的块ID
      left: null, // 左侧连接的块ID
      right: null, // 右侧连接的块ID
    };
  }

  // 生成唯一ID的静态方法
  static _generateUniqueId() {
    return `block_${++Block._idCounter}_${Date.now()}`;
  }

  // 根据类别获取颜色
  getColorByCategory() {
    const categoryConfig = Block.CATEGORIES[this.category];
    return categoryConfig ? categoryConfig.color : "#999999";
  }

  // 获取类别名称
  getCategoryName() {
    const categoryConfig = Block.CATEGORIES[this.category];
    return categoryConfig ? categoryConfig.name : "未知类型";
  }

  // 获取类别图标
  getCategoryIcon() {
    const categoryConfig = Block.CATEGORIES[this.category];
    if (categoryConfig && categoryConfig.icon) {
      return categoryConfig.icon;
    }
    // 默认图标
    return equipment;
  }

  // 静态方法：获取所有可用类别
  static getAvailableCategories() {
    return Object.keys(Block.CATEGORIES);
  }

  // 静态方法：验证类别是否有效
  static isValidCategory(categoryId) {
    return Object.prototype.hasOwnProperty.call(Block.CATEGORIES, categoryId);
  }

  // 获取块的中心点
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  // 检查是否与其他块重叠
  wouldOverlap(targetX, targetY, otherBlock) {
    return (
      targetX < otherBlock.x + otherBlock.width &&
      targetX + this.width > otherBlock.x &&
      targetY < otherBlock.y + otherBlock.height &&
      targetY + this.height > otherBlock.y
    );
  }

  // 检查位置是否有效（不出界且不重叠）
  isValidPosition(targetX, targetY, allBlocks, checkOverlap = true) {
    // 检查是否出界
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX + this.width > canvasWidth.value ||
      targetY + this.height > canvasHeight.value
    ) {
      return false;
    }

    if (!checkOverlap) {
      return true;
    }

    // 检查是否与其他块重叠
    for (const block of allBlocks) {
      if (block === this || block.place_state === Block.PLACE_STATE.original) {
        continue;
      }

      if (this.wouldOverlap(targetX, targetY, block)) {
        return false;
      }
    }

    return true;
  }

  // 尝试吸附到其他块
  snapTo(otherBlock, allBlocks) {
    const thisCenter = this.getCenter();
    const otherCenter = otherBlock.getCenter();

    const diffX = thisCenter.x - otherCenter.x;
    const diffY = thisCenter.y - otherCenter.y;

    let newX = this.x;
    let newY = this.y;
    let willSnap = false;
    let connectionDirection = null; // 记录连接方向

    if (
      Math.abs(diffX) < this.width + SNAP_THRESHOLD &&
      Math.abs(diffY) < this.height + SNAP_THRESHOLD
    ) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // 水平吸附（左或右）
        if (diffX > 0) {
          newX = otherBlock.x + otherBlock.width + SNAP_SPACING;
          connectionDirection = "horizontal-right"; // 当前块在目标块右侧
        } else {
          newX = otherBlock.x - this.width - SNAP_SPACING;
          connectionDirection = "horizontal-left"; // 当前块在目标块左侧
        }
        newY = otherBlock.y; // 水平对齐
        willSnap = true;
      } else {
        // 垂直吸附（上或下）
        if (diffY > 0) {
          newY = otherBlock.y + otherBlock.height + SNAP_SPACING;
          connectionDirection = "vertical-bottom"; // 当前块在目标块下方
        } else {
          newY = otherBlock.y - this.height - SNAP_SPACING;
          connectionDirection = "vertical-top"; // 当前块在目标块上方
        }
        newX = otherBlock.x; // 垂直对齐
        willSnap = true;
      }

      // 检查新位置是否有效
      if (willSnap && this.isValidPosition(newX, newY, allBlocks)) {
        return {
          x: newX,
          y: newY,
          distance: Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2)),
          snapped: true,
          connectionDirection: connectionDirection,
          targetBlockId: otherBlock.id,
        };
      }
    }

    return { x: this.x, y: this.y, distance: Infinity, snapped: false };
  }

  // 建立与其他块的连接
  establishConnection(direction, targetBlockId) {
    // 清除当前方向的连接
    this.connections[direction] = targetBlockId;
  }

  // 断开连接
  breakConnection(direction) {
    this.connections[direction] = null;
  }

  // 断开所有连接
  breakAllConnections() {
    this.connections = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };
  }

  // 获取连接信息
  getConnections() {
    return { ...this.connections };
  }

  // 检查是否有连接
  hasConnections() {
    return Object.values(this.connections).some(
      (connection) => connection !== null
    );
  }

  // 创建块的静态方法
  static createBlock(x, y, placeState, category = "1") {
    return new Block(x, y, placeState, category);
  }

  // 创建块的深拷贝
  clone() {
    const clonedBlock = new Block(
      this.x,
      this.y,
      this.place_state,
      this.category
    );
    // 注意：clone会自动生成新的ID，这通常是我们想要的行为
    return clonedBlock;
  }
}

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

// 原始块 - 基于可用类别动态生成
const originalBlocks = Object.keys(Block.CATEGORIES).map((categoryId) =>
  Block.createBlock(0, 0, Block.PLACE_STATE.original, categoryId)
);

// 已放置的块
const placedBlocks = ref([]);

// 合并所有块
const allBlocks = computed(() => [...originalBlocks, ...placedBlocks.value]);

// 当前正在拖动的块
const draggingBlock = ref(null);

// 拖拽状态相关
const isDragStarted = ref(false); // 是否已经开始拖拽
const dragStartX = ref(0); // 拖拽开始时的鼠标X坐标
const dragStartY = ref(0); // 拖拽开始时的鼠标Y坐标
const potentialDragBlock = ref(null); // 潜在拖拽块（点击但还未达到拖拽阈值）

// 当前选中的块
const selectedBlock = ref(null);

// 是否触发了吸附
const isSnapped = ref(false);

// 画布容器引用
const canvasContainerRef = ref(null);

// 删除区域引用和状态
const deleteZoneRef = ref(null);
const isOverDelete = ref(false);

// 侧边栏状态
const isAsideCollapsed = ref(false);
const asidePadding = 20;
const expandedAsideWidthPx = Block.PARAMS.width + 2 * asidePadding; // 定义侧边栏展开时的固定宽度

// 是否可以清空工作区
const clearWorkspaceValid = computed(() => {
  return placedBlocks.value.length > 0;
});

const asideStyle = computed(() => ({
  width: isAsideCollapsed.value ? "0px" : `${expandedAsideWidthPx}px`,
  padding: isAsideCollapsed.value ? "0" : asidePadding + "px",
}));

const toggleButtonStyle = computed(() => ({
  left: isAsideCollapsed.value ? "1px" : `${expandedAsideWidthPx}px`,
}));

function toggleAside() {
  isAsideCollapsed.value = !isAsideCollapsed.value;
}

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
    const minOffsetX = Math.min(
      0,
      containerWidth - canvasWidth.value * scale.value
    );
    const minOffsetY = Math.min(
      0,
      containerHeight - canvasHeight.value * scale.value
    );

    offsetX.value = Math.max(minOffsetX, offsetX.value);
    offsetY.value = Math.max(minOffsetY, offsetY.value);
  }
}

// 初始化画布大小和位置
function initializeCanvas() {
  if (canvasContainerRef.value) {
    const containerWidth = canvasContainerRef.value.clientWidth;
    const containerHeight = canvasContainerRef.value.clientHeight;

    // 设置画布大小为容器宽度的两倍
    canvasWidth.value = containerWidth * 2;
    canvasHeight.value = containerWidth * 2; // 保持正方形

    // 计算居中位置
    const centerX = (containerWidth - canvasWidth.value) / 2;
    const centerY = (containerHeight - canvasHeight.value) / 2;

    // 设置初始偏移使画布居中
    offsetX.value = centerX;
    offsetY.value = centerY;

    // 重置缩放
    scale.value = 1;
  }
}

// 重置画布到初始状态
function resetCanvas() {
  if (!canvasContainerRef.value) return;

  const containerWidth = canvasContainerRef.value.clientWidth;
  const containerHeight = canvasContainerRef.value.clientHeight;

  // 重置缩放
  scale.value = 1;

  // 如果有已放置的块，计算它们的边界框并居中显示
  if (placedBlocks.value.length > 0) {
    // 计算所有块的边界框
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    placedBlocks.value.forEach((block) => {
      minX = Math.min(minX, block.x);
      minY = Math.min(minY, block.y);
      maxX = Math.max(maxX, block.x + block.width);
      maxY = Math.max(maxY, block.y + block.height);
    });

    // 计算块群的中心点
    const blocksCenter = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };

    // 计算容器中心点
    const containerCenter = {
      x: containerWidth / 2,
      y: containerHeight / 2,
    };

    // 设置偏移使块群居中显示
    offsetX.value = containerCenter.x - blocksCenter.x;
    offsetY.value = containerCenter.y - blocksCenter.y;
  } else {
    // 如果没有块，则将画布居中
    const centerX = (containerWidth - canvasWidth.value) / 2;
    const centerY = (containerHeight - canvasHeight.value) / 2;

    offsetX.value = centerX;
    offsetY.value = centerY;
  }

  // 检查边界
  checkBoundaries();
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

  const minScaleX = containerWidth / canvasWidth.value;
  const minScaleY = containerHeight / canvasHeight.value;
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
    if (block.place_state === Block.PLACE_STATE.original) {
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
      (block.place_state === Block.PLACE_STATE.placed ? scale.value : 1);
    const blockHeight =
      block.height *
      (block.place_state === Block.PLACE_STATE.placed ? scale.value : 1);

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

  // 记录拖拽开始位置
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  isDragStarted.value = false; // 重置拖拽状态

  if (block.place_state === Block.PLACE_STATE.original) {
    // 计算鼠标在画布坐标系中的位置（考虑缩放和偏移）
    const rect = canvasContainerRef.value.getBoundingClientRect();
    let mouseX = (event.clientX - rect.left - offsetX.value) / scale.value;
    let mouseY = (event.clientY - rect.top - offsetY.value) / scale.value;

    // 创建新块并放置到画布中
    const newBlock = Block.createBlock(
      mouseX,
      mouseY,
      Block.PLACE_STATE.placed,
      block.category
    );
    placedBlocks.value.push(newBlock);
    potentialDragBlock.value = newBlock;
    selectedBlock.value = newBlock; // 选中新的块
  } else {
    potentialDragBlock.value = block;
    selectedBlock.value = block; // 选中正在拖拽的块
  }
  event.stopPropagation(); // 防止触发画布拖拽
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

  // 处理拖拽阈值检测
  if (potentialDragBlock.value && !isDragStarted.value) {
    const deltaX = Math.abs(event.clientX - dragStartX.value);
    const deltaY = Math.abs(event.clientY - dragStartY.value);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果移动距离小于阈值，不进行拖拽
    if (distance < DRAG_THRESHOLD) {
      return;
    }

    // 超过阈值，开始拖拽
    isDragStarted.value = true;
    draggingBlock.value = potentialDragBlock.value;
  }

  // 处理块拖拽
  if (!draggingBlock.value) {
    isOverDelete.value = false; // 确保在没有拖动时重置
    return;
  }

  // 检查是否悬停在删除区域
  if (deleteZoneRef.value) {
    const deleteRect = deleteZoneRef.value.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (
      mouseX >= deleteRect.left &&
      mouseX <= deleteRect.right &&
      mouseY >= deleteRect.top &&
      mouseY <= deleteRect.bottom
    ) {
      isOverDelete.value = true;
    } else {
      isOverDelete.value = false;
    }
  } else {
    isOverDelete.value = false;
  }

  const rect = canvasContainerRef.value.getBoundingClientRect();

  // 计算鼠标在画布坐标系中的位置（考虑缩放和偏移）
  let mouseXInCanvas =
    (event.clientX - rect.left - offsetX.value) / scale.value;
  let mouseYInCanvas = (event.clientY - rect.top - offsetY.value) / scale.value;

  // 初始坐标（带网格吸附）
  let newX =
    Math.round((mouseXInCanvas - Block.PARAMS.width / 2) / GRID_SIZE) *
    GRID_SIZE;
  let newY =
    Math.round((mouseYInCanvas - Block.PARAMS.height / 2) / GRID_SIZE) *
    GRID_SIZE;

  // 限制拖动边界，确保块不会超出画布
  newX = Math.max(0, Math.min(canvasWidth.value - Block.PARAMS.width, newX));
  newY = Math.max(0, Math.min(canvasHeight.value - Block.PARAMS.height, newY));

  // 检查初始移动位置是否合法
  let initialMoveValid = draggingBlock.value.isValidPosition(
    newX,
    newY,
    allBlocks.value,
    false
  );

  // 跟随鼠标移动
  draggingBlock.value.x = newX;
  draggingBlock.value.y = newY;

  isSnapped.value = false; // 在检测吸附前重置

  let finalX = newX;
  let finalY = newY;
  let snapConnection = null; // 存储吸附连接信息

  // 只有初始位置合法时才尝试吸附 (并且没有在删除区域上方)
  if (initialMoveValid && !isOverDelete.value) {
    let snapResults = [];

    for (const otherBlock of allBlocks.value) {
      if (otherBlock === draggingBlock.value) continue; // 自己不吸附
      if (otherBlock.place_state === Block.PLACE_STATE.original) continue; // 原始块不参与吸附

      // 尝试吸附到该块
      const snapResult = draggingBlock.value.snapTo(
        otherBlock,
        allBlocks.value
      );

      if (snapResult.snapped) {
        snapResults.push(snapResult);
      }
    }

    // 选择距离最近的块进行吸附
    if (snapResults.length > 0) {
      let minDist = Number.MAX_VALUE;
      let bestSnapResult = null;

      for (const result of snapResults) {
        if (result.distance < minDist) {
          minDist = result.distance;
          bestSnapResult = result;
        }
      }

      if (bestSnapResult) {
        finalX = bestSnapResult.x;
        finalY = bestSnapResult.y;
        isSnapped.value = true;
        snapConnection = bestSnapResult; // 保存连接信息
      }
    }
  }

  // 最终检查确保移动合法 (如果不在删除区域上)
  if (
    !isOverDelete.value &&
    draggingBlock.value.isValidPosition(finalX, finalY, allBlocks.value)
  ) {
    // 更新块的位置
    draggingBlock.value.x = finalX;
    draggingBlock.value.y = finalY;

    // 如果发生了吸附，建立连接关系
    if (snapConnection && snapConnection.snapped) {
      // 先断开当前块的所有连接（因为位置改变了）
      draggingBlock.value.breakAllConnections();

      // 根据连接方向建立新连接
      let currentBlockDirection, targetBlockDirection;

      switch (snapConnection.connectionDirection) {
        case "horizontal-right":
          currentBlockDirection = "left";
          targetBlockDirection = "right";
          break;
        case "horizontal-left":
          currentBlockDirection = "right";
          targetBlockDirection = "left";
          break;
        case "vertical-bottom":
          currentBlockDirection = "top";
          targetBlockDirection = "bottom";
          break;
        case "vertical-top":
          currentBlockDirection = "bottom";
          targetBlockDirection = "top";
          break;
      }

      // 建立双向连接
      draggingBlock.value.establishConnection(
        currentBlockDirection,
        snapConnection.targetBlockId
      );

      // 找到目标块并建立反向连接
      const targetBlock = placedBlocks.value.find(
        (b) => b.id === snapConnection.targetBlockId
      );
      if (targetBlock) {
        targetBlock.establishConnection(
          targetBlockDirection,
          draggingBlock.value.id
        );
      }
    }
  } else if (isOverDelete.value) {
    draggingBlock.value.x = newX;
    draggingBlock.value.y = newY;
  }
}

function onMouseUp() {
  if (draggingBlock.value && isOverDelete.value) {
    // 删除块时需要断开所有相关连接
    const blockToDelete = draggingBlock.value;

    // 断开其他块与该块的连接
    placedBlocks.value.forEach((block) => {
      Object.keys(block.connections).forEach((direction) => {
        if (block.connections[direction] === blockToDelete.id) {
          block.breakConnection(direction);
        }
      });
    });

    // 删除块
    const index = placedBlocks.value.findIndex(
      (b) => b === draggingBlock.value
    );
    if (index !== -1) {
      placedBlocks.value.splice(index, 1);
    }
    if (selectedBlock.value === draggingBlock.value) {
      selectedBlock.value = null;
    }
    draggingBlock.value = null;
    potentialDragBlock.value = null;
    isOverDelete.value = false;
    isSnapped.value = false;
    isDragStarted.value = false;
    return;
  }

  // 拖拽结束后更新所有连接关系
  if (draggingBlock.value) {
    // 延迟更新连接，确保位置已经最终确定
    setTimeout(() => {
      updateAllConnections();
    }, 10);
  }

  // 停止平移
  if (isPanning.value) {
    isPanning.value = false;
  }

  // 停止拖拽
  draggingBlock.value = null;
  potentialDragBlock.value = null;
  isSnapped.value = false;
  isOverDelete.value = false;
  isDragStarted.value = false;
}

function getPlacedBlockList() {
  return placedBlocks.value.map((block) => ({
    id: block.id,
    x: block.x,
    y: block.y,
    category: block.category,
    connections: block.getConnections(),
  }));
}

// 更新所有块之间的连接关系
function updateAllConnections() {
  // 先清除所有连接
  placedBlocks.value.forEach((block) => {
    block.breakAllConnections();
  });

  // 重新计算所有连接
  placedBlocks.value.forEach((block) => {
    placedBlocks.value.forEach((otherBlock) => {
      if (block === otherBlock) return;

      // 检查是否相邻并建立连接
      const isAdjacent = checkIfAdjacent(block, otherBlock);
      if (isAdjacent.adjacent) {
        block.establishConnection(isAdjacent.direction, otherBlock.id);
      }
    });
  });
}

// 检查两个块是否相邻
function checkIfAdjacent(block1, block2) {
  const tolerance = SNAP_SPACING + 1; // 允许的误差范围

  // 检查水平相邻（左右）
  if (Math.abs(block1.y - block2.y) < tolerance) {
    // 块1在块2右侧 - 块1的左侧连接块2，块2的右侧连接块1
    if (
      Math.abs(block1.x - (block2.x + block2.width + SNAP_SPACING)) < tolerance
    ) {
      return { adjacent: true, direction: "left" }; // 块1连接块2的方向是左侧
    }
    // 块1在块2左侧 - 块1的右侧连接块2，块2的左侧连接块1
    if (
      Math.abs(block1.x + block1.width + SNAP_SPACING - block2.x) < tolerance
    ) {
      return { adjacent: true, direction: "right" }; // 块1连接块2的方向是右侧
    }
  }

  // 检查垂直相邻（上下）
  if (Math.abs(block1.x - block2.x) < tolerance) {
    // 块1在块2下方 - 块1的上侧连接块2，块2的下侧连接块1
    if (
      Math.abs(block1.y - (block2.y + block2.height + SNAP_SPACING)) < tolerance
    ) {
      return { adjacent: true, direction: "top" }; // 块1连接块2的方向是上方
    }
    // 块1在块2上方 - 块1的下侧连接块2，块2的上侧连接块1
    if (
      Math.abs(block1.y + block1.height + SNAP_SPACING - block2.y) < tolerance
    ) {
      return { adjacent: true, direction: "bottom" }; // 块1连接块2的方向是下方
    }
  }

  return { adjacent: false, direction: null };
}

// 添加键盘事件处理函数
function handleKeyDown(event) {
  // 如果按下Delete或Backspace键，并且有选中的块
  if (
    (event.key === "Delete" || event.key === "Backspace") &&
    selectedBlock.value
  ) {
    // 只有已放置的块可以删除，原始模板不能删除
    if (selectedBlock.value.place_state === Block.PLACE_STATE.placed) {
      const blockToDelete = selectedBlock.value;

      // 断开其他块与该块的连接
      placedBlocks.value.forEach((block) => {
        Object.keys(block.connections).forEach((direction) => {
          if (block.connections[direction] === blockToDelete.id) {
            block.breakConnection(direction);
          }
        });
      });

      // 从已放置块数组中移除选中的块
      const index = placedBlocks.value.findIndex(
        (block) => block === selectedBlock.value
      );
      if (index !== -1) {
        placedBlocks.value.splice(index, 1);
      }
      // 清除选中状态
      selectedBlock.value = null;

      // 更新剩余块的连接关系
      updateAllConnections();
    }
  }
}

// 在组件挂载时添加键盘事件监听器
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);

  // 初始化画布（只在启动时执行一次）
  initializeCanvas();
});

// 在组件卸载时移除键盘事件监听器
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

// 根据placedBlockList重新生成工作区
function loadFromBlockList(blockList) {
  try {
    // 清空当前工作区
    placedBlocks.value = [];
    selectedBlock.value = null;
    draggingBlock.value = null;

    // 重置块ID计数器，避免ID冲突
    const maxId = blockList.reduce((max, blockData) => {
      const idMatch = blockData.id.match(/block_(\d+)_/);
      if (idMatch) {
        const idNumber = parseInt(idMatch[1]);
        return Math.max(max, idNumber);
      }
      return max;
    }, 0);

    // 更新计数器，确保新创建的块不会有ID冲突
    Block._idCounter = maxId;

    // 创建块映射表，用于后续建立连接关系
    const blockMap = new Map();

    // 第一步：创建所有块（不建立连接）
    blockList.forEach((blockData) => {
      const newBlock = new Block(
        blockData.x,
        blockData.y,
        Block.PLACE_STATE.placed,
        blockData.category
      );

      // 手动设置块的ID以保持一致性
      newBlock.id = blockData.id;

      // 清空默认连接
      newBlock.breakAllConnections();

      // 添加到工作区
      placedBlocks.value.push(newBlock);

      // 添加到映射表
      blockMap.set(blockData.id, newBlock);
    });

    // 第二步：根据连接信息建立块之间的连接关系
    blockList.forEach((blockData) => {
      const block = blockMap.get(blockData.id);
      if (block && blockData.connections) {
        // 恢复每个方向的连接
        Object.keys(blockData.connections).forEach((direction) => {
          const connectedBlockId = blockData.connections[direction];
          if (connectedBlockId && blockMap.has(connectedBlockId)) {
            block.establishConnection(direction, connectedBlockId);
          }
        });
      }
    });

    // 验证和修复连接关系（确保双向连接的一致性）
    validateAndFixConnections();
    return true;
  } catch (error) {
    console.error("加载工作区失败:", error);

    // 发生错误时清空工作区
    placedBlocks.value = [];
    selectedBlock.value = null;
    draggingBlock.value = null;

    return false;
  }
}

// 验证和修复连接关系，确保双向连接的一致性
function validateAndFixConnections() {
  const connectionMap = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };

  placedBlocks.value.forEach((block) => {
    Object.keys(block.connections).forEach((direction) => {
      const connectedBlockId = block.connections[direction];

      if (connectedBlockId) {
        // 找到连接的目标块
        const targetBlock = placedBlocks.value.find(
          (b) => b.id === connectedBlockId
        );

        if (targetBlock) {
          const reverseDirection = connectionMap[direction];

          // 检查目标块是否有对应的反向连接
          if (targetBlock.connections[reverseDirection] !== block.id) {
            console.warn(
              `修复连接不一致: ${block.id}(${direction}) -> ${connectedBlockId}`
            );
            // 建立反向连接
            targetBlock.establishConnection(reverseDirection, block.id);
          }
        } else {
          // 目标块不存在，清除这个连接
          console.warn(
            `清除无效连接: ${block.id}(${direction}) -> ${connectedBlockId}`
          );
          block.breakConnection(direction);
        }
      }
    });
  });
}

// 检查工作区数据的有效性
function validateWorkspaceData(blockList) {
  if (!Array.isArray(blockList)) {
    throw new Error("块列表必须是数组");
  }

  const requiredFields = ["id", "x", "y", "category"];
  const blockIds = new Set();
  const validCategories = Block.getAvailableCategories();

  blockList.forEach((blockData, index) => {
    // 检查必需字段
    requiredFields.forEach((field) => {
      if (!(field in blockData)) {
        throw new Error(`块 ${index} 缺少必需字段: ${field}`);
      }
    });

    // 检查ID唯一性
    if (blockIds.has(blockData.id)) {
      throw new Error(`重复的块ID: ${blockData.id}`);
    }
    blockIds.add(blockData.id);

    // 检查坐标有效性
    if (typeof blockData.x !== "number" || typeof blockData.y !== "number") {
      throw new Error(`块 ${blockData.id} 的坐标必须是数字`);
    }

    // 检查坐标范围
    if (
      blockData.x < 0 ||
      blockData.y < 0 ||
      blockData.x > canvasWidth.value - Block.PARAMS.width ||
      blockData.y > canvasHeight.value - Block.PARAMS.height
    ) {
      throw new Error(`块 ${blockData.id} 的坐标超出画布范围`);
    }

    // 检查类别有效性 - 使用动态类别验证
    if (!Block.isValidCategory(blockData.category)) {
      throw new Error(
        `块 ${blockData.id} 的类别无效: ${
          blockData.category
        }，有效类别: ${validCategories.join(", ")}`
      );
    }
  });

  return true;
}

// 安全的工作区加载函数（带验证）
function safeLoadFromBlockList(blockList) {
  try {
    // 先验证数据
    validateWorkspaceData(blockList);

    // 加载数据
    return loadFromBlockList(blockList);
  } catch (error) {
    console.error("工作区数据验证失败:", error.message);
    return false;
  }
}

// 获取块类别配置
function getBlockCategories() {
  return { ...Block.CATEGORIES };
}

// 暴露接口
defineExpose({
  resetCanvas,
  zoomIn,
  zoomOut,
  clearWorkspace,
  getPlacedBlockList,
  safeLoadFromBlockList,
  getBlockCategories,
  clearWorkspaceValid,
  scale,
});
</script>

<style scoped>
.aside-toggle-button .icon {
  width: 14px; /* 调整图标大小 */
  height: 14px;
  color: #606266;
}

.canvas-content {
  /* 添加网格背景 */
  background-image: linear-gradient(
      to right,
      rgba(150, 150, 150, 0.2) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, rgba(150, 150, 150, 0.2) 1px, transparent 1px);
  background-color: white;
  position: absolute;
  box-shadow: 0 0 2px gray;
}

/* 当平移时改变鼠标样式 */
.container-main:active {
  cursor: grabbing;
}

.canvas-container {
  height: 100%;
  flex: 1; /* 占据剩余空间 */
  z-index: 1;
  overflow: hidden;
  position: relative;
  padding: 0;
  display: flex;
}

.delete-zone {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 60px;
  background-color: rgba(255, 77, 79, 0.7);
  border: 2px dashed #cc0000;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  z-index: 5;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  pointer-events: none;
}

.delete-zone .icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.delete-zone.active {
  background-color: rgba(204, 0, 0, 0.9);
  border-color: #a70000;
}

.main-container {
  position: relative; /* 保持 relative 以便绝对定位的子元素（如toggle button）*/
  overflow: hidden;
  flex: 1;
  padding: 0;
  display: flex; /* 使 home-aside 和 canvas-container 水平排列 */
}

/* 新增：平移状态下的光标样式 */
.main-container.panning {
  cursor: grabbing !important; /* 确保在平移时始终为抓取光标 */
}
</style>
