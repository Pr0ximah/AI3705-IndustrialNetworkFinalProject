<template>
  <div
    @mouseup="onMouseUp"
    @mousemove="onMouseMove"
    @mousedown="onMouseDown"
    @wheel="onWheel"
    @mouseleave="onMouseLeave"
    :class="{ panning: isPanning }"
    class="main-container cannot-select"
  >
    <div class="home-aside" :style="asideStyle" @wheel="onSidebarWheel">
      <div class="sidebar-title" :style="sidebarTitleStyle">组件库</div>
      <div class="block-sidebar">
        <!-- 侧边栏内容 -->
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
            selected: selectedBlock === block,
          }"
        >
          <!-- 左侧接口区域 -->
          <div class="connector-region left-connector-region">
            <div class="connector-group">
              <div
                class="connector signal-connector"
                v-for="signal in block.categoryConf.signal_input"
                :key="signal.name"
              />
            </div>
            <div class="connector-group">
              <div
                class="connector var-connector"
                v-for="variable in block.categoryConf.var_input"
                :key="variable.name"
              />
            </div>
          </div>
          <!-- 右侧接口区域 -->
          <div class="connector-region right-connector-region">
            <div class="connector-group">
              <div
                class="connector signal-connector"
                v-for="signal in block.categoryConf.signal_output"
                :key="signal.name"
              />
            </div>
            <div class="connector-group">
              <div
                class="connector var-connector"
                v-for="variable in block.categoryConf.var_output"
                :key="variable.name"
              />
            </div>
          </div>
          <img :src="block.getCategoryIcon()" class="icon" draggable="false" />
          {{ block.getCategoryName() }}
        </div>
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
    <div
      ref="canvasContainerRef"
      class="canvas-container"
      :style="{
        cursor: isConnecting || potentialSelectConnector ? 'pointer' : 'auto',
      }"
    >
      <!-- SVG连线层 - 移到 canvas-container 层级 -->
      <svg class="connections-layer">
        <!-- 已建立的连接线 -->
        <path
          v-for="connection in connections"
          :key="connection.id"
          :d="getConnectionPath(connection)"
          class="connection-line"
          :class="{
            selected:
              selectedConnection === connection ||
              selectedConnections.has(connection),
            'signal-connection': connection.type === 'signal',
            'var-connection': connection.type === 'var',
          }"
          @click="selectConnection(connection, $event)"
        />
        <!-- 正在绘制的连接线 -->
        <path
          v-if="isConnecting && connectingStart"
          :d="getConnectingPath()"
          class="connecting-line"
        />
      </svg>

      <div class="canvas-content" :style="canvasStyle" @click="clearSelection">
        <!-- 选择框 -->
        <div
          v-if="isSelecting && selectionBox"
          class="selection-box"
          :style="{
            left: selectionBox.x + 'px',
            top: selectionBox.y + 'px',
            width: selectionBox.width + 'px',
            height: selectionBox.height + 'px',
          }"
        />

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
            zIndex: draggingBlock === block ? 10 : -1,
          }"
          @mousedown="startDrag(block, $event)"
          @click.stop="selectBlock(block, $event)"
          class="drag-block"
          :class="{
            selected: selectedBlock === block || selectedBlocks.has(block),
            dragging: draggingBlocks.has(block), // 修改：使用draggingBlocks检查
          }"
        >
          <!-- 左侧接口区域 -->
          <div class="connector-region left-connector-region">
            <div class="connector-group">
              <div
                class="connector signal-connector"
                v-for="(signal, signalIndex) in block.categoryConf.signal_input"
                :key="signal.name"
                :class="{
                  active: isConnectorActive(block, 'signal_input', signalIndex),
                  connected: isConnectorConnected(
                    block,
                    'signal_input',
                    signalIndex
                  ),
                  snapped: isConnectorSnapped(
                    block,
                    'signal_input',
                    signalIndex
                  ),
                }"
                @mousedown.stop="
                  startConnection(block, 'signal_input', signalIndex, $event)
                "
                @mouseup.stop="
                  endConnection(block, 'signal_input', signalIndex, $event)
                "
              />
            </div>
            <div class="connector-group">
              <div
                class="connector var-connector"
                v-for="(variable, varIndex) in block.categoryConf.var_input"
                :key="variable.name"
                :class="{
                  active: isConnectorActive(block, 'var_input', varIndex),
                  connected: isConnectorConnected(block, 'var_input', varIndex),
                  snapped: isConnectorSnapped(block, 'var_input', varIndex),
                }"
                @mousedown.stop="
                  startConnection(block, 'var_input', varIndex, $event)
                "
                @mouseup.stop="
                  endConnection(block, 'var_input', varIndex, $event)
                "
              />
            </div>
          </div>
          <!-- 右侧接口区域 -->
          <div class="connector-region right-connector-region">
            <div class="connector-group">
              <div
                class="connector signal-connector"
                v-for="(signal, signalIndex) in block.categoryConf
                  .signal_output"
                :key="signal.name"
                :class="{
                  active: isConnectorActive(
                    block,
                    'signal_output',
                    signalIndex
                  ),
                  connected: isConnectorConnected(
                    block,
                    'signal_output',
                    signalIndex
                  ),
                  snapped: isConnectorNearby(
                    block,
                    'signal_output',
                    signalIndex
                  ),
                }"
                @mousedown.stop="
                  startConnection(block, 'signal_output', signalIndex, $event)
                "
                @mouseup.stop="
                  endConnection(block, 'signal_output', signalIndex, $event)
                "
              />
            </div>
            <div class="connector-group">
              <div
                class="connector var-connector"
                v-for="(variable, varIndex) in block.categoryConf.var_output"
                :key="variable.name"
                :class="{
                  active: isConnectorActive(block, 'var_output', varIndex),
                  connected: isConnectorConnected(
                    block,
                    'var_output',
                    varIndex
                  ),
                  snapped: isConnectorNearby(block, 'var_output', varIndex),
                }"
                @mousedown.stop="
                  startConnection(block, 'var_output', varIndex, $event)
                "
                @mouseup.stop="
                  endConnection(block, 'var_output', varIndex, $event)
                "
              />
            </div>
          </div>
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
  nextTick,
} from "vue";
import {
  VarConf,
  SignalConf,
  InternalVarConf,
  ECAction,
  ECState,
  ECTransition,
  AlgorithmConf,
  CategoryConf,
} from "./BlockBaseConf";
import { ElMessageBox, ElLoading } from "element-plus";
import { Delete, DArrowLeft, DArrowRight } from "@element-plus/icons-vue";
import equipment from "@/assets/equipment.svg";
import service from "@/util/ajax_inst.js";

const DRAG_THRESHOLD = 3; // 拖拽阈值：鼠标移动超过5像素才触发拖拽
const BLOCK_COLOR_MAP = ["#f9b4ab", "#fdebd3", "#ccd9ff", "#f0fff0", "#e4d6ff"]; // 块颜色映射
const blockCategories = ref([]);

class Block {
  // 静态属性
  static PLACE_STATE = {
    original: "original",
    placed: "placed",
  };

  static PARAMS = {
    width: 100,
    height: 100,
  };

  // 静态计数器用于生成唯一ID
  static _idCounter = 0;

  // 构造函数
  constructor(x, y, placeState, categoryConf) {
    this.id = Block._generateUniqueId(); // 生成唯一ID
    this.x = x;
    this.y = y;
    this.width = Block.PARAMS.width;
    this.height = Block.PARAMS.height;
    this.categoryConf = categoryConf; // 类别配置
    this.categoryIndex = blockCategories.value.findIndex(
      (conf) => conf === categoryConf
    );
    this.place_state = placeState;
    this.color = this.getColorByCategory();

    // 连接信息：存储连接到此块的连接器信息
    this.connectors = {
      signal_input: [], // 信号输入连接器状态
      signal_output: [], // 信号输出连接器状态
      var_input: [], // 变量输入连接器状态
      var_output: [], // 变量输出连接器状态
    };

    // 初始化连接器状态
    this.initializeConnectors();
  }

  // 初始化连接器状态
  initializeConnectors() {
    this.connectors.signal_input = this.categoryConf.signal_input.map(() => ({
      connected: false,
      connectionId: null,
    }));
    this.connectors.signal_output = this.categoryConf.signal_output.map(() => ({
      connected: false,
      connectionIds: [], // 输出可以连接多个
    }));
    this.connectors.var_input = this.categoryConf.var_input.map(() => ({
      connected: false,
      connectionId: null,
    }));
    this.connectors.var_output = this.categoryConf.var_output.map(() => ({
      connected: false,
      connectionIds: [], // 输出可以连接多个
    }));
  }

  // 生成唯一ID的静态方法
  static _generateUniqueId() {
    return `block_${++Block._idCounter}_${Date.now()}`;
  }

  // 根据类别获取颜色
  getColorByCategory() {
    const color = safeGet(BLOCK_COLOR_MAP, this.categoryIndex);
    return color ? color : "#FFFFFF";
  }

  // 获取类别名称
  getCategoryName() {
    return this.categoryConf.name;
  }

  // 获取类别图标
  getCategoryIcon() {
    // 默认图标
    return equipment;
  }

  // 获取块的中心点
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  // 创建块的静态方法
  static createBlock(x, y, placeState, categoryConf) {
    return new Block(x, y, placeState, categoryConf);
  }

  // 创建块的深拷贝
  clone() {
    const clonedBlock = new Block(
      this.x,
      this.y,
      this.place_state,
      this.categoryConf
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

// 连接线状态变量
let connections = ref([]); // 存储所有连接线
const selectedConnection = ref(null); // 当前选中的连接线
const isConnecting = ref(false); // 是否正在连接
const connectingStart = ref(null); // 连接开始位置
let connectionIdCounter = 0;
let potentialConnectTarget = null; // 潜在连接目标（用于连接线吸附）
let potentialSelectConnector = ref(null);

// 当前鼠标位置（用于连接线绘制）
const currentMouseX = ref(0);
const currentMouseY = ref(0);

const CONNECTOR_SNAP_THRESHOLD = 25; // 连接器吸附阈值

// 连线自动避让参数
const LINE_SPACING = 10; // 连接线间距
const MIN_SEGMENT_LENGTH = 20; // 最小线段长度

// 连接器类型中文名映射
const connectorTypeNames = {
  signal_input: "信号输入",
  signal_output: "信号输出",
  var_input: "变量输入",
  var_output: "变量输出",
};

// 画布样式计算属性
const canvasStyle = computed(() => {
  return {
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
  };
});

// 原始块 - 基于可用类别动态生成
const originalBlocks = computed(() =>
  blockCategories.value.map((category) =>
    Block.createBlock(0, 0, Block.PLACE_STATE.original, category)
  )
);

// 已放置的块
let placedBlocks = ref([]);

// 合并所有块
const allBlocks = computed(() => [
  ...originalBlocks.value,
  ...placedBlocks.value,
]);

// 当前正在拖动的块
const draggingBlock = ref(null);
const draggingBlocks = ref(new Set()); // 新增：所有正在拖动的块集合

// 拖拽状态相关
const isDragStarted = ref(false); // 是否已经开始拖拽
const dragStartX = ref(0); // 拖拽开始时的鼠标X坐标
const dragStartY = ref(0); // 拖拽开始时的鼠标Y坐标
const potentialDragBlock = ref(null); // 潜在拖拽块（点击但还未达到拖拽阈值）
const multiDragOffsets = ref(new Map()); // 多选拖拽时各块的相对偏移

// 当前选中的块
const selectedBlock = ref(null);
const selectedBlocks = ref(new Set()); // 多选块集合

// 连接线选择相关
const selectedConnections = ref(new Set()); // 多选连接线集合

// 画布容器引用
const canvasContainerRef = ref(null);

// 删除区域引用和状态
const deleteZoneRef = ref(null);
const isOverDelete = ref(false);

// 拖动选择相关状态
const isSelecting = ref(false);
const selectionStart = ref({ x: 0, y: 0 });
const selectionEnd = ref({ x: 0, y: 0 });
const selectionBox = computed(() => {
  if (!isSelecting.value) return null;

  const minX = Math.min(selectionStart.value.x, selectionEnd.value.x);
  const minY = Math.min(selectionStart.value.y, selectionEnd.value.y);
  const maxX = Math.max(selectionStart.value.x, selectionEnd.value.x);
  const maxY = Math.max(selectionStart.value.y, selectionEnd.value.y);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
});

// 侧边栏状态
const isAsideCollapsed = ref(false);
const asidePadding = 20;
const blockBorderWidth = 1; // 块边框宽度
const expandedAsideWidthPx =
  Block.PARAMS.width + 2 * asidePadding + blockBorderWidth * 2; // 定义侧边栏展开时的固定宽度

// 是否可以清空工作区
const clearWorkspaceValid = computed(() => {
  return placedBlocks.value.length > 0;
});

const asideStyle = computed(() => ({
  width: isAsideCollapsed.value
    ? "0px"
    : `${Block.PARAMS.width + blockBorderWidth * 2}px`,
  paddingLeft: isAsideCollapsed.value ? "0" : asidePadding + "px",
  paddingRight: isAsideCollapsed.value ? "0" : asidePadding + "px",
}));

const sidebarTitleStyle = computed(() => ({
  minWidth: `${Block.PARAMS.width + blockBorderWidth * 2 - 10}px`,
}));

const toggleButtonStyle = computed(() => ({
  left: isAsideCollapsed.value ? "1px" : `${expandedAsideWidthPx + 1}px`,
}));

// 简化的连接器位置计算函数
const getConnectorPosition = (block, type, index) => {
  return computed(() => {
    // 基础位置计算：块的位置 + 连接器相对位置
    const baseX = block.x;
    const baseY = block.y;

    // 根据连接器类型和索引计算相对位置
    const connectorRelativePos = calculateConnectorRelativePosition(
      block,
      type,
      index
    );

    return {
      x: baseX + connectorRelativePos.x,
      y: baseY + connectorRelativePos.y,
    };
  });
};

// 计算连接器相对于块的位置
function calculateConnectorRelativePosition(block, type, index) {
  const connectorWidth = 8;
  const connectorHeight = 10;
  const lineBlockSpacing = 2; // 连接器与块边界的间距
  const connectorSpacing = 5; // 同组内连接器间距
  const topBottomMargin = 6 + connectorHeight / 2; // 顶部边距
  const borderWidth = 1;

  let x, y;

  // 计算X坐标
  if (type.includes("input")) {
    // 左侧连接器 - 位于块边界上
    x = -connectorWidth / 2 + borderWidth - lineBlockSpacing;
  } else {
    // 右侧连接器 - 位于块右边界上
    x = block.width + connectorWidth / 2 + borderWidth * 2 + lineBlockSpacing;
  }

  // 计算Y坐标 - 基于连接器类型和索引
  const isSignal = type.includes("signal");
  if (isSignal) {
    // 信号连接器位于上半部分
    const signalConnectors = block.categoryConf[type] || [];
    const signalCount = signalConnectors.length;

    const signalStartY = topBottomMargin + borderWidth;
    if (signalCount > 0) {
      y = signalStartY + index * (connectorSpacing + connectorHeight);
    } else {
      y = signalStartY;
    }
  } else {
    // 变量连接器位于下半部分，从下往上堆叠
    const varConnectors = block.categoryConf[type] || [];
    const varCount = varConnectors.length;

    const baseY = block.height - topBottomMargin + 3 * borderWidth;
    if (varCount > 0) {
      // 变量连接器从块底部开始，向上堆叠
      // 从下往上计算：最下面的连接器是index=0，向上依次递减
      y = baseY - (varCount - 1 - index) * (connectorSpacing + connectorHeight);
    } else {
      y = baseY;
    }
  }

  return { x, y };
}

function toggleAside() {
  isAsideCollapsed.value = !isAsideCollapsed.value;
}

// 初始化画布大小和位置
function initializeCanvas() {
  if (canvasContainerRef.value) {
    const containerWidth = canvasContainerRef.value.clientWidth;
    const containerHeight = canvasContainerRef.value.clientHeight;

    // 设置初始偏移为0，让画布从原点开始
    offsetX.value = containerWidth / 2;
    offsetY.value = containerHeight / 2;

    // 重置缩放
    scale.value = 1;
  }
}

// 自动调整画布位置
function adjustCanvas() {
  if (!canvasContainerRef.value) return;

  const containerWidth = canvasContainerRef.value.clientWidth;
  const containerHeight = canvasContainerRef.value.clientHeight;

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

    // 添加padding确保块不会贴边显示
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // 计算内容区域的尺寸
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 计算适合的缩放比例，确保所有内容都能显示
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, 1); // 不超过1倍缩放

    // 设置缩放
    scale.value = fitScale;

    // 计算内容区域的中心点
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // 计算容器中心点
    const containerCenterX = containerWidth / 2;
    const containerCenterY = containerHeight / 2;

    // 设置偏移使内容居中显示
    offsetX.value = containerCenterX - contentCenterX * fitScale;
    offsetY.value = containerCenterY - contentCenterY * fitScale;
  } else {
    // 如果没有块，则重置缩放并将画布居中
    scale.value = 1;
    offsetX.value = containerWidth / 2;
    offsetY.value = containerHeight / 2;
  }
}

// 统一的缩放函数
function zoom(zoomFactor, centerX, centerY) {
  // 移除最小缩放限制，设置更宽松的缩放范围
  const minScale = 0.1;
  const maxScale = 3.0;

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
function clearWorkspace(confirm_clear = true) {
  if (placedBlocks.value.length > 0) {
    if (!confirm_clear) {
      // 如果不需要确认，直接清空
      connections.value = [];
      placedBlocks.value = [];
      selectedBlock.value = null;
      selectedConnection.value = null;
      return;
    }
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
        // 清空所有连接
        connections.value = [];
        // 清空已放置的块
        placedBlocks.value = [];
        // 清除选中状态
        selectedBlock.value = null;
        selectedConnection.value = null;
      })
      .catch(() => {
        // 取消操作
      });
  }
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

// 检查鼠标是否在侧边栏区域
function isMouseOverSidebar(event) {
  if (isAsideCollapsed.value) return false;

  const sidebarWidth = expandedAsideWidthPx;
  return event.clientX >= 0 && event.clientX <= sidebarWidth;
}

// 处理侧边栏滚轮事件
function onSidebarWheel(event) {
  // 阻止事件冒泡到主容器，防止画布缩放
  event.stopPropagation();
  // 允许默认的滚动行为
}

// 鼠标按下事件
function onMouseDown(event) {
  // 中键按下始终为平移
  if (event.button === 1) {
    // 如果在侧边栏区域，不启动平移
    if (isMouseOverSidebar(event)) {
      return;
    }
    isPanning.value = true;
    lastMouseX.value = event.clientX;
    lastMouseY.value = event.clientY;
    event.preventDefault();
    return;
  }

  // 左键按下
  if (event.button === 0) {
    // 更新鼠标位置
    updateMousePosition(event);
    // 检测附近连接器
    checkConnectorNearbyToStartConnect();
    // 如果有附近的连接器，开始连接
    if (potentialSelectConnector.value) {
      const block = potentialSelectConnector.value.block;
      const type = potentialSelectConnector.value.type;
      const index = potentialSelectConnector.value.index;
      startConnection(block, type, index, event);
      return; // 阻止事件冒泡
    }

    // 如果点击画布空白区域，清除选中或开始选择框
    if (!isMouseOverBlock(event)) {
      // 如果没有按住Ctrl/Cmd键，清除选中
      if (!event.ctrlKey && !event.metaKey) {
        selectedBlock.value = null;
        selectedBlocks.value.clear();
        selectedConnection.value = null;
        selectedConnections.value.clear();
      }

      // 如果按住Shift键且不在侧边栏区域，则开始平移画布
      if (event.shiftKey && !isMouseOverSidebar(event)) {
        isPanning.value = true;
        lastMouseX.value = event.clientX;
        lastMouseY.value = event.clientY;
        event.preventDefault();
      } else if (!isMouseOverSidebar(event)) {
        // 开始拖动选择
        const rect = canvasContainerRef.value.getBoundingClientRect();
        const canvasX =
          (event.clientX - rect.left - offsetX.value) / scale.value;
        const canvasY =
          (event.clientY - rect.top - offsetY.value) / scale.value;

        isSelecting.value = true;
        selectionStart.value = { x: canvasX, y: canvasY };
        selectionEnd.value = { x: canvasX, y: canvasY };
      }
    }
    // 否则让块的mousedown事件处理（会触发startDrag）
  }
}

// 处理鼠标滚轮事件
function onWheel(event) {
  // 如果在侧边栏区域，不处理缩放
  if (isMouseOverSidebar(event)) {
    return;
  }

  event.preventDefault();

  // 根据滚轮方向决定缩放因子
  let wheelZoomSpeed = 0.05;
  const zoomFactor = event.deltaY < 0 ? wheelZoomSpeed : -wheelZoomSpeed;

  // 使用鼠标位置作为缩放中心点
  zoom(zoomFactor, event.clientX, event.clientY);
}

// 鼠标移出事件
function onMouseLeave(event) {
  // 结束拖动选择
  if (isSelecting.value) {
    isSelecting.value = false;
    // 如果选择框内有内容，将它们设为选中状态
    const totalSelected =
      selectedBlocks.value.size + selectedConnections.value.size;

    if (totalSelected > 0) {
      // 如果只选中了一个元素，设置为单选
      if (totalSelected === 1) {
        if (selectedBlocks.value.size === 1) {
          selectedBlock.value = Array.from(selectedBlocks.value)[0];
          selectedBlocks.value.clear();
        } else if (selectedConnections.value.size === 1) {
          selectedConnection.value = Array.from(selectedConnections.value)[0];
          selectedConnections.value.clear();
        }
      }
    }
  }

  // 结束连接状态
  if (potentialConnectTarget) {
    potentialConnectTarget = null; // 清除潜在连接目标
  }
  if (isConnecting.value) {
    connectingStart.value = null;
    isConnecting.value = false; // 结束连接状态
  }
  potentialSelectConnector.value = null; // 清除潜在连接器

  // 停止平移
  if (isPanning.value) {
    isPanning.value = false;
  }

  // 停止拖拽
  if (draggingBlock.value) {
    draggingBlock.value = null;
    potentialDragBlock.value = null;
    isOverDelete.value = false;
    isDragStarted.value = false;
    multiDragOffsets.value.clear();
    draggingBlocks.value.clear(); // 清空拖动块集合
  }
}

// 选中块
function selectBlock(block, event) {
  // 阻止事件冒泡，防止触发画布的click事件
  event.stopPropagation();

  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd + 点击：切换选择状态
    if (selectedBlocks.value.has(block)) {
      selectedBlocks.value.delete(block);
      if (selectedBlock.value === block) {
        selectedBlock.value = null;
      }
    } else {
      selectedBlocks.value.add(block);
      if (selectedBlock.value) {
        selectedBlocks.value.add(selectedBlock.value);
        selectedBlock.value = null;
      }
    }
  } else {
    // 普通点击：单选
    selectedBlocks.value.clear();
    selectedBlock.value = block;
  }
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
      block.categoryConf
    );
    placedBlocks.value.push(newBlock);
    potentialDragBlock.value = newBlock;
    selectedBlock.value = newBlock; // 选中新的块

    // 清空多选状态，因为这是新建块
    selectedBlocks.value.clear();
    multiDragOffsets.value.clear();
  } else {
    potentialDragBlock.value = block;

    // 检查是否为多选拖拽
    if (selectedBlocks.value.has(block) || selectedBlock.value === block) {
      // 如果拖拽的块在选中的块中，准备多选拖拽
      setupMultiDrag(block, event);
    } else {
      // 如果拖拽的块不在选中的块中，清空选择并单选
      selectedBlocks.value.clear();
      selectedBlock.value = block;
      multiDragOffsets.value.clear();
    }
  }
  event.stopPropagation(); // 防止触发画布拖拽
}

// 设置多选拖拽
function setupMultiDrag(primaryBlock, event) {
  // 计算鼠标在画布坐标系中的位置
  const rect = canvasContainerRef.value.getBoundingClientRect();
  const mouseXInCanvas =
    (event.clientX - rect.left - offsetX.value) / scale.value;
  const mouseYInCanvas =
    (event.clientY - rect.top - offsetY.value) / scale.value;

  multiDragOffsets.value.clear();

  // 获取所有要拖拽的块
  const blocksToMove = new Set();
  if (selectedBlock.value) {
    blocksToMove.add(selectedBlock.value);
  }
  selectedBlocks.value.forEach((block) => blocksToMove.add(block));

  // 计算每个块相对于鼠标位置的偏移
  blocksToMove.forEach((block) => {
    const offsetX = block.x - mouseXInCanvas;
    const offsetY = block.y - mouseYInCanvas;
    multiDragOffsets.value.set(block.id, { x: offsetX, y: offsetY });
  });
}

// 获取所有需要拖拽的块
function getAllDragBlocks() {
  const blocksToMove = new Set();
  if (selectedBlock.value) {
    blocksToMove.add(selectedBlock.value);
  }
  selectedBlocks.value.forEach((block) => blocksToMove.add(block));
  return Array.from(blocksToMove);
}

function checkLineSnap() {
  function closeEnoughDist(pos1, pos2) {
    let dist = Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
    if (dist < CONNECTOR_SNAP_THRESHOLD) {
      return dist;
    } else {
      return null; // 不在吸附范围内
    }
  }
  potentialConnectTarget = null; // 重置潜在连接目标

  // 检查是否有块在连接线附近
  if (!isConnecting.value || !connectingStart.value) return;

  const startBlock = connectingStart.value.block;
  const startType = connectingStart.value.type;

  const mousePos = {
    x: currentMouseX.value,
    y: currentMouseY.value,
  };
  let minDist = Infinity;

  // 检查所有块的连接器位置
  for (const block of placedBlocks.value) {
    if (block === startBlock) continue; // 跳过起始块
    if (startType.includes("signal")) {
      // 检查信号输入连接器
      for (let i = 0; i < block.categoryConf.signal_input.length; i++) {
        const pos = getConnectorPosition(block, "signal_input", i).value;
        const dist = closeEnoughDist(mousePos, pos);
        if (dist !== null && dist < minDist) {
          minDist = dist;
          potentialConnectTarget = {
            block,
            type: "signal_input",
            index: i,
          };
        }
      }
    } else if (startType.includes("var")) {
      // 检查变量输入连接器
      for (let i = 0; i < block.categoryConf.var_input.length; i++) {
        const pos = getConnectorPosition(block, "var_input", i).value;
        const dist = closeEnoughDist(mousePos, pos);
        if (dist !== null && dist < minDist) {
          minDist = dist;
          potentialConnectTarget = {
            block,
            type: "var_input",
            index: i,
          };
        }
      }
    }
  }
}

function checkConnectorNearbyToStartConnect() {
  function closeEnoughDist(pos1, pos2) {
    let dist = Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
    if (dist < CONNECTOR_SNAP_THRESHOLD) {
      return dist;
    } else {
      return null; // 不在吸附范围内
    }
  }
  potentialSelectConnector.value = null; // 重置潜在连接器
  const mousePos = {
    x: currentMouseX.value,
    y: currentMouseY.value,
  };
  let minDist = Infinity;

  // 检查所有块的连接器位置
  for (const block of placedBlocks.value) {
    // 检查信号输出连接器
    for (let i = 0; i < block.categoryConf.signal_output.length; i++) {
      const pos = getConnectorPosition(block, "signal_output", i).value;
      const dist = closeEnoughDist(mousePos, pos);
      if (dist !== null && dist < minDist) {
        minDist = dist;
        potentialSelectConnector.value = {
          block,
          type: "signal_output",
          index: i,
        };
      }
    }

    // 检查变量输出连接器
    for (let i = 0; i < block.categoryConf.var_output.length; i++) {
      const pos = getConnectorPosition(block, "var_output", i).value;
      const dist = closeEnoughDist(mousePos, pos);
      if (dist !== null && dist < minDist) {
        minDist = dist;
        potentialSelectConnector.value = {
          block,
          type: "var_output",
          index: i,
        };
      }
    }
  }
}

function onMouseMove(event) {
  // 更新鼠标位置
  updateMousePosition(event);

  // 检测附近连接器
  checkConnectorNearbyToStartConnect();

  // 检测连线吸附
  checkLineSnap();

  // 处理拖动选择
  if (isSelecting.value) {
    const rect = canvasContainerRef.value.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left - offsetX.value) / scale.value;
    const canvasY = (event.clientY - rect.top - offsetY.value) / scale.value;

    selectionEnd.value = { x: canvasX, y: canvasY };
    updateSelectionBoxBlocks();
    return;
  }

  // 处理画布平移
  if (isPanning.value) {
    // 如果鼠标在侧边栏区域，停止平移
    if (isMouseOverSidebar(event)) {
      isPanning.value = false;
      return;
    }

    const dx = event.clientX - lastMouseX.value;
    const dy = event.clientY - lastMouseY.value;

    offsetX.value += dx;
    offsetY.value += dy;

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

    // 更新所有拖动的块集合
    updateDraggingBlocks();
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

  // 检查是否为多选拖拽
  if (multiDragOffsets.value.size > 0) {
    // 多选拖拽：移动所有选中的块
    const blocksToMove = getAllDragBlocks();

    if (!isOverDelete.value && !isMouseOverSidebar(event)) {
      blocksToMove.forEach((block) => {
        const offset = multiDragOffsets.value.get(block.id);
        if (offset) {
          block.x = mouseXInCanvas + offset.x;
          block.y = mouseYInCanvas + offset.y;
        }
      });
    } else if (isOverDelete.value) {
      // 在删除区域时也要更新位置，但会在松开鼠标时删除
      blocksToMove.forEach((block) => {
        const offset = multiDragOffsets.value.get(block.id);
        if (offset) {
          block.x = mouseXInCanvas + offset.x;
          block.y = mouseYInCanvas + offset.y;
        }
      });
    }
  } else {
    // 单选拖拽：原有逻辑
    let newX = mouseXInCanvas - Block.PARAMS.width / 2;
    let newY = mouseYInCanvas - Block.PARAMS.height / 2;

    let finalX = newX;
    let finalY = newY;

    // 最终检查确保移动合法
    if (!isOverDelete.value && !isMouseOverSidebar(event)) {
      // 更新块的位置
      draggingBlock.value.x = finalX;
      draggingBlock.value.y = finalY;
    } else if (isOverDelete.value) {
      draggingBlock.value.x = newX;
      draggingBlock.value.y = newY;
    }
  }
}

// 新增：更新拖动块集合
function updateDraggingBlocks() {
  draggingBlocks.value.clear();

  if (multiDragOffsets.value.size > 0) {
    // 多选拖拽：添加所有要拖动的块
    const blocksToMove = getAllDragBlocks();
    blocksToMove.forEach((block) => {
      draggingBlocks.value.add(block);
    });
  } else if (draggingBlock.value) {
    // 单选拖拽：只添加主拖动块
    draggingBlocks.value.add(draggingBlock.value);
  }
}

function onMouseUp() {
  // 结束拖动选择
  if (isSelecting.value) {
    isSelecting.value = false;
    // 如果选择框内有内容，将它们设为选中状态
    const totalSelected =
      selectedBlocks.value.size + selectedConnections.value.size;

    if (totalSelected > 0) {
      // 如果只选中了一个元素，设置为单选
      if (totalSelected === 1) {
        if (selectedBlocks.value.size === 1) {
          selectedBlock.value = Array.from(selectedBlocks.value)[0];
          selectedBlocks.value.clear();
        } else if (selectedConnections.value.size === 1) {
          selectedConnection.value = Array.from(selectedConnections.value)[0];
          selectedConnections.value.clear();
        }
      }
      // 多个元素保持多选状态
    }
    return;
  }

  if (potentialConnectTarget) {
    // 如果有潜在连接目标，尝试创建连接
    const success = createConnection(
      connectingStart.value,
      potentialConnectTarget
    );
    potentialConnectTarget = null; // 清除潜在连接目标
  }
  if (isConnecting.value) {
    connectingStart.value = null;
    isConnecting.value = false; // 结束连接状态
  }
  potentialSelectConnector.value = null; // 清除潜在连接器

  if (draggingBlock.value && isOverDelete.value) {
    // 删除块（如果是多选，删除所有选中的块）
    if (multiDragOffsets.value.size > 0) {
      // 多选删除
      const blocksToDelete = getAllDragBlocks();
      blocksToDelete.forEach((block) => deleteBlock(block));
      selectedBlocks.value.clear();
      selectedBlock.value = null;
    } else {
      // 单选删除
      deleteBlock(draggingBlock.value);
      if (selectedBlock.value === draggingBlock.value) {
        selectedBlock.value = null;
      }
    }

    draggingBlock.value = null;
    potentialDragBlock.value = null;
    isOverDelete.value = false;
    isDragStarted.value = false;
    multiDragOffsets.value.clear();
    draggingBlocks.value.clear(); // 清空拖动块集合
    return;
  }

  // 停止平移
  if (isPanning.value) {
    isPanning.value = false;
  }

  // 停止拖拽
  draggingBlock.value = null;
  potentialDragBlock.value = null;
  isOverDelete.value = false;
  isDragStarted.value = false;
  multiDragOffsets.value.clear();
  draggingBlocks.value.clear(); // 清空拖动块集合
}

// 创建连接
function createConnection(start, end) {
  // 检查输入连接器是否已经被占用
  if (end.block.connectors[end.type][end.index].connected) {
    ElMessageBox({
      title: "连接失败",
      message: `${end.block.categoryConf.name} 的 ${
        connectorTypeNames[end.type]
      } 连接器已被占用`,
      type: "warning",
      showClose: false,
      showConfirmButton: false,
      closeOnClickModal: true,
      closeOnPressEscape: true,
      customClass: "default-message-box",
    }).catch(() => {
      // do nothing
    });
    return false;
  }

  const connectionId = `connection_${++connectionIdCounter}`;

  const connection = {
    id: connectionId,
    type: start.type.includes("signal") ? "signal" : "var",
    start: {
      blockId: start.block.id,
      type: start.type,
      index: start.index,
    },
    end: {
      blockId: end.block.id,
      type: end.type,
      index: end.index,
    },
    // 使用响应式计算属性实现实时位置追踪
    startPosition: computed(() => {
      const pos = getConnectorPosition(start.block, start.type, start.index);
      return pos.value;
    }),
    endPosition: computed(() => {
      const pos = getConnectorPosition(end.block, end.type, end.index);
      return pos.value;
    }),
  };

  connections.value.push(connection);

  // 更新块的连接状态
  start.block.connectors[start.type][start.index].connected = true;
  start.block.connectors[start.type][start.index].connectionIds.push(
    connectionId
  );
  end.block.connectors[end.type][end.index].connected = true;
  end.block.connectors[end.type][end.index].connectionId = connectionId;

  // 强制重新计算所有连接路径以应用避让
  nextTick(() => {
    connections.value = [...connections.value];
  });

  return true;
}

// 删除连接
function deleteConnection(connection) {
  const startBlock = placedBlocks.value.find(
    (b) => b.id === connection.start.blockId
  );
  const endBlock = placedBlocks.value.find(
    (b) => b.id === connection.end.blockId
  );

  // 更新起始块的连接状态（输出连接器）
  if (startBlock) {
    const startConnector =
      startBlock.connectors[connection.start.type][connection.start.index];
    if (startConnector.connectionIds) {
      const index = startConnector.connectionIds.indexOf(connection.id);
      if (index > -1) {
        startConnector.connectionIds.splice(index, 1);
      }
      // 如果没有连接了，更新connected状态
      if (startConnector.connectionIds.length === 0) {
        startConnector.connected = false;
      }
    }
  }

  // 更新目标块的连接状态（输入连接器）
  if (endBlock) {
    const endConnector =
      endBlock.connectors[connection.end.type][connection.end.index];
    endConnector.connected = false;
    endConnector.connectionId = null;
  }

  // 从连接数组中移除
  const connectionIndex = connections.value.findIndex(
    (c) => c.id === connection.id
  );
  if (connectionIndex > -1) {
    connections.value.splice(connectionIndex, 1);
  }

  // 强制重新计算剩余连接路径以重新应用避让
  nextTick(() => {
    connections.value = [...connections.value];
  });
}

// 删除块及其相关连接
function deleteBlock(block) {
  // 找到与该块相关的所有连接并删除
  const relatedConnections = connections.value.filter(
    (conn) => conn.start.blockId === block.id || conn.end.blockId === block.id
  );

  relatedConnections.forEach((conn) => deleteConnection(conn));

  // 从已放置块数组中移除
  const index = placedBlocks.value.findIndex((b) => b === block);
  if (index !== -1) {
    placedBlocks.value.splice(index, 1);
  }
}

// 选择连接
function selectConnection(connection, event) {
  event.stopPropagation();

  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd + 点击：切换选择状态
    if (selectedConnections.value.has(connection)) {
      selectedConnections.value.delete(connection);
      if (selectedConnection.value === connection) {
        selectedConnection.value = null;
      }
    } else {
      selectedConnections.value.add(connection);
      if (selectedConnection.value) {
        selectedConnections.value.add(selectedConnection.value);
        selectedConnection.value = null;
      }
    }
  } else {
    // 普通点击：单选
    selectedConnections.value.clear();
    selectedBlocks.value.clear();
    selectedBlock.value = null;
    selectedConnection.value = connection;
  }
}

// 检查连接器是否激活（正在连接时的视觉反馈）
function isConnectorActive(block, type, index) {
  if (!isConnecting.value || !connectingStart.value) return false;

  // 起始连接器高亮
  if (
    connectingStart.value.block === block &&
    connectingStart.value.type === type &&
    connectingStart.value.index === index
  ) {
    return true;
  }

  // 可连接的目标连接器高亮
  if (
    (type === "signal_input" || type === "var_input") &&
    !block.connectors[type][index].connected
  ) {
    const startIsSignal = connectingStart.value.type.includes("signal");
    const targetIsSignal = type.includes("signal");
    return (
      startIsSignal === targetIsSignal && connectingStart.value.block !== block
    );
  }

  return false;
}

// 检查连接器是否已连接
function isConnectorConnected(block, type, index) {
  return (
    block.connectors[type][index].connected ||
    (block.connectors[type][index].connectionIds &&
      block.connectors[type][index].connectionIds.length > 0)
  );
}

function isConnectorSnapped(block, type, index) {
  // 检查连接器是否被吸附到其他块
  if (potentialConnectTarget) {
    return (
      potentialConnectTarget.block === block &&
      potentialConnectTarget.type === type &&
      potentialConnectTarget.index === index
    );
  }
  return false;
}

function isConnectorNearby(block, type, index) {
  // 检查连接器是否在鼠标附近
  if (potentialSelectConnector.value) {
    return (
      potentialSelectConnector.value.block === block &&
      potentialSelectConnector.value.type === type &&
      potentialSelectConnector.value.index === index
    );
  }
  return false;
}

// 更新鼠标位置（画布坐标系）
function updateMousePosition(event) {
  const rect = canvasContainerRef.value.getBoundingClientRect();
  currentMouseX.value =
    (event.clientX - rect.left - offsetX.value) / scale.value;
  currentMouseY.value =
    (event.clientY - rect.top - offsetY.value) / scale.value;
}

// 检查块是否在选择框内
function isBlockInSelectionBox(block) {
  if (!selectionBox.value) return false;

  const box = selectionBox.value;
  const blockLeft = block.x;
  const blockTop = block.y;
  const blockRight = block.x + block.width;
  const blockBottom = block.y + block.height;

  // 检查是否有重叠
  return !(
    blockRight < box.x ||
    blockLeft > box.x + box.width ||
    blockBottom < box.y ||
    blockTop > box.y + box.height
  );
}

// 检查连接线是否与选择框相交
function isConnectionInSelectionBox(connection) {
  if (!selectionBox.value) return false;

  const box = selectionBox.value;
  const startCoords = connection.startPosition;
  const endCoords = connection.endPosition;

  // 获取连接线的路径点（简化为三段直线）
  const midX = startCoords.x + (endCoords.x - startCoords.x) * 0.5;

  const lineSegments = [
    { x1: startCoords.x, y1: startCoords.y, x2: midX, y2: startCoords.y },
    { x1: midX, y1: startCoords.y, x2: midX, y2: endCoords.y },
    { x1: midX, y1: endCoords.y, x2: endCoords.x, y2: endCoords.y },
  ];

  // 检查任何一段是否与选择框相交
  return lineSegments.some((segment) => isLineIntersectBox(segment, box));
}

// 检查线段是否与矩形相交
function isLineIntersectBox(line, box) {
  const { x1, y1, x2, y2 } = line;
  const { x: boxX, y: boxY, width: boxW, height: boxH } = box;

  // 检查线段端点是否在矩形内
  if (isPointInBox(x1, y1, box) || isPointInBox(x2, y2, box)) {
    return true;
  }

  // 检查线段是否与矩形的四条边相交
  const boxEdges = [
    { x1: boxX, y1: boxY, x2: boxX + boxW, y2: boxY }, // 上边
    { x1: boxX, y1: boxY + boxH, x2: boxX + boxW, y2: boxY + boxH }, // 下边
    { x1: boxX, y1: boxY, x2: boxX, y2: boxY + boxH }, // 左边
    { x1: boxX + boxW, y1: boxY, x2: boxX + boxW, y2: boxY + boxH }, // 右边
  ];

  return boxEdges.some((edge) => doLinesIntersect(line, edge));
}

// 检查点是否在矩形内
function isPointInBox(x, y, box) {
  return (
    x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height
  );
}

// 检查两条线段是否相交
function doLinesIntersect(line1, line2) {
  const { x1: x1, y1: y1, x2: x2, y2: y2 } = line1;
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return false; // 平行线

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// 更新选择框内的块和连接线
function updateSelectionBoxBlocks() {
  if (!isSelecting.value) return;

  const newSelectedBlocks = new Set();
  const newSelectedConnections = new Set();

  // 选择块
  for (const block of placedBlocks.value) {
    if (isBlockInSelectionBox(block)) {
      newSelectedBlocks.add(block);
    }
  }

  // 选择连接线
  for (const connection of connections.value) {
    if (isConnectionInSelectionBox(connection)) {
      newSelectedConnections.add(connection);
    }
  }

  selectedBlocks.value = newSelectedBlocks;
  selectedConnections.value = newSelectedConnections;
}

// 清除选中
function clearSelection() {
  selectedBlock.value = null;
  selectedBlocks.value.clear();
  selectedConnection.value = null;
  selectedConnections.value.clear();
}

// 键盘事件处理函数
function handleKeyDown(event) {
  // Delete键删除选中的块或连接
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedBlocks.value.size > 0) {
      // 删除多选的块
      selectedBlocks.value.forEach((block) => deleteBlock(block));
      selectedBlocks.value.clear();
    } else if (selectedConnections.value.size > 0) {
      // 删除多选的连接线
      selectedConnections.value.forEach((connection) =>
        deleteConnection(connection)
      );
      selectedConnections.value.clear();
    } else if (selectedBlock.value) {
      deleteBlock(selectedBlock.value);
      selectedBlock.value = null;
    } else if (selectedConnection.value) {
      deleteConnection(selectedConnection.value);
      selectedConnection.value = null;
    }
    event.preventDefault();
  }

  // Escape键清除选中状态
  if (event.key === "Escape") {
    selectedBlock.value = null;
    selectedBlocks.value.clear();
    selectedConnection.value = null;
    selectedConnections.value.clear();
    multiDragOffsets.value.clear();
    draggingBlocks.value.clear(); // 清空拖动块集合
    if (isConnecting.value) {
      isConnecting.value = false;
      connectingStart.value = null;
    }
    event.preventDefault();
  }
}

// 简化开始连接的逻辑
function startConnection(block, type, index, event) {
  event.stopPropagation();

  if (isConnecting.value) {
    // 如果已经在连接状态，尝试结束连接
    endConnection(block, type, index, event);
    return;
  }

  // 只有输出连接器可以作为起始点
  if (!type.includes("output")) {
    return;
  }

  isConnecting.value = true;
  connectingStart.value = {
    block: block,
    type: type,
    index: index,
  };

  updateMousePosition(event);
}

// 结束连接
function endConnection(block, type, index, event) {
  event.stopPropagation();

  if (!isConnecting.value || !connectingStart.value) {
    return;
  }

  // 检查是否是有效的连接目标
  if (type.includes("input")) {
    // 检查连接类型是否匹配（信号对信号，变量对变量）
    const startIsSignal = connectingStart.value.type.includes("signal");
    const targetIsSignal = type.includes("signal");

    if (
      startIsSignal === targetIsSignal &&
      connectingStart.value.block !== block
    ) {
      // 尝试创建连接
      const success = createConnection(
        {
          block: connectingStart.value.block,
          type: connectingStart.value.type,
          index: connectingStart.value.index,
        },
        {
          block: block,
          type: type,
          index: index,
        }
      );
    }
  }

  // 重置连接状态
  isConnecting.value = false;
  connectingStart.value = null;
  potentialConnectTarget = null; // 清除潜在连接目标
}

// 生成连接线的 SVG 路径（横平竖直，带避让）
function getConnectionPath(connection) {
  return computed(() => {
    // 获取实时的连接器位置
    const startCoords = connection.startPosition;
    const endCoords = connection.endPosition;

    // 转换为屏幕坐标
    const x1 = startCoords.x * scale.value + offsetX.value;
    const y1 = startCoords.y * scale.value + offsetY.value;
    const x2 = endCoords.x * scale.value + offsetX.value;
    const y2 = endCoords.y * scale.value + offsetY.value;

    // 计算避让路径
    const path = calculateAvoidancePath(connection, x1, y1, x2, y2);

    return path;
  }).value;
}

// 计算避让路径
function calculateAvoidancePath(currentConnection, x1, y1, x2, y2) {
  // 获取所有其他连接线的路径信息
  const otherConnections = connections.value.filter(
    (conn) => conn.id !== currentConnection.id
  );

  // 计算基础路径的中间点
  const direction = x2 > x1 ? 1 : -1; // 连线方向
  let midX = x1 + (x2 - x1) * 0.5;

  // 检查是否需要避让
  const conflictingConnections = findConflictingConnections(
    currentConnection,
    otherConnections,
    x1,
    y1,
    x2,
    y2,
    midX
  );

  if (conflictingConnections.length === 0) {
    // 没有冲突，使用基础路径
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }

  // 有冲突，计算避让路径
  const avoidanceOffset = calculateAvoidanceOffset(
    currentConnection,
    conflictingConnections
  );

  // 根据连线方向和避让偏移调整路径
  const adjustedMidX = midX + avoidanceOffset * LINE_SPACING * direction;

  // 确保调整后的中间点不会太靠近起点或终点
  const minMidX = Math.min(x1, x2) + MIN_SEGMENT_LENGTH * direction;
  const maxMidX = Math.max(x1, x2) - MIN_SEGMENT_LENGTH * direction;
  const finalMidX = Math.max(minMidX, Math.min(maxMidX, adjustedMidX));

  return `M ${x1} ${y1} L ${finalMidX} ${y1} L ${finalMidX} ${y2} L ${x2} ${y2}`;
}

// 查找冲突的连接线
function findConflictingConnections(
  currentConnection,
  otherConnections,
  x1,
  y1,
  x2,
  y2,
  midX
) {
  const conflicting = [];
  const tolerance = LINE_SPACING; // 冲突检测容忍度

  otherConnections.forEach((otherConn) => {
    const otherStart = otherConn.startPosition;
    const otherEnd = otherConn.endPosition;

    const otherX1 = otherStart.x * scale.value + offsetX.value;
    const otherY1 = otherStart.y * scale.value + offsetY.value;
    const otherX2 = otherEnd.x * scale.value + offsetX.value;
    const otherY2 = otherEnd.y * scale.value + offsetY.value;

    const otherMidX = otherX1 + (otherX2 - otherX1) * 0.5;

    // 检查水平线段是否冲突
    if (
      checkHorizontalSegmentConflict(
        x1,
        y1,
        midX,
        otherX1,
        otherY1,
        otherMidX,
        tolerance
      ) ||
      checkHorizontalSegmentConflict(
        midX,
        y2,
        x2,
        otherMidX,
        otherY2,
        otherX2,
        tolerance
      ) ||
      checkVerticalSegmentConflict(
        midX,
        y1,
        y2,
        otherMidX,
        otherY1,
        otherY2,
        tolerance
      )
    ) {
      conflicting.push(otherConn);
    }
  });

  return conflicting;
}

// 检查水平线段冲突
function checkHorizontalSegmentConflict(
  x1,
  y1,
  x2,
  otherX1,
  otherY1,
  otherX2,
  tolerance
) {
  // 检查Y坐标是否接近
  if (Math.abs(y1 - otherY1) < tolerance) {
    // 检查X坐标是否有重叠
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const otherMinX = Math.min(otherX1, otherX2);
    const otherMaxX = Math.max(otherX1, otherX2);

    return !(maxX < otherMinX || minX > otherMaxX);
  }
  return false;
}

// 检查垂直线段冲突
function checkVerticalSegmentConflict(
  x1,
  y1,
  y2,
  otherX1,
  otherY1,
  otherY2,
  tolerance
) {
  // 检查X坐标是否接近
  if (Math.abs(x1 - otherX1) < tolerance) {
    // 检查Y坐标是否有重叠
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const otherMinY = Math.min(otherY1, otherY2);
    const otherMaxY = Math.max(otherY1, otherY2);

    return !(maxY < otherMinY || minY > otherMaxY);
  }
  return false;
}

// 计算避让偏移量
function calculateAvoidanceOffset(currentConnection, conflictingConnections) {
  // 根据连接线的ID确定一个稳定的避让偏移
  const connectionIndex = connections.value.findIndex(
    (conn) => conn.id === currentConnection.id
  );
  const conflictCount = conflictingConnections.length;

  // 使用连接线索引和冲突数量计算偏移
  // 这样可以确保相同的连接组合总是产生相同的避让模式
  const baseOffset = Math.floor(connectionIndex / 2) + 1;
  const direction = connectionIndex % 2 === 0 ? 1 : -1;

  return baseOffset * direction;
}

// 优化正在连接时的临时连接线路径
function getConnectingPath() {
  return computed(() => {
    if (!connectingStart.value) return "";

    // 获取起始连接器的实时位置
    const startPos = getConnectorPosition(
      connectingStart.value.block,
      connectingStart.value.type,
      connectingStart.value.index
    ).value;

    const x1 = startPos.x * scale.value + offsetX.value;
    const y1 = startPos.y * scale.value + offsetY.value;
    const x2 = currentMouseX.value * scale.value + offsetX.value;
    const y2 = currentMouseY.value * scale.value + offsetY.value;

    // 对于正在连接的线，使用简单的中点路径，不做避让
    const midX = x1 + (x2 - x1) * 0.5;

    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }).value;
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);

  // 添加全局鼠标事件监听，处理鼠标移出浏览器窗口的情况
  document.addEventListener("mouseleave", handleDocumentMouseLeave);
  window.addEventListener("blur", handleWindowBlur);

  // 初始化画布（只在启动时执行一次）
  initializeCanvas();

  // 获取所有类别定义
  getBlockCategories();
});

// 在组件卸载时移除键盘事件监听器
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);

  // 移除全局事件监听器
  document.removeEventListener("mouseleave", handleDocumentMouseLeave);
  window.removeEventListener("blur", handleWindowBlur);
});

// 处理鼠标移出文档区域
function handleDocumentMouseLeave(event) {
  // 检查鼠标是否真的离开了浏览器窗口
  if (
    event.clientY <= 0 ||
    event.clientX <= 0 ||
    event.clientX >= window.innerWidth ||
    event.clientY >= window.innerHeight
  ) {
    onMouseLeave(event);
  }
}

// 处理窗口失去焦点
function handleWindowBlur(event) {
  onMouseLeave(event);
}

function getBlockCategories() {
  const loading = ElLoading.service({
    lock: true,
    customClass: "default-loading",
    text: "正在读取模型定义...",
    background: "rgba(255, 255, 255, 0.7)",
  });
  service
    .get("/inputs/categories")
    .then((response) => {
      console.log(response);
      if (response.data.categories && response.data.categories.length > 0) {
        // 清空现有类别
        blockCategories.value = [];
        // 添加新类别
        response.data.categories.forEach((categoryJSON) => {
          blockCategories.value.push(createBlockCategoryByJSON(categoryJSON));
        });
      } else {
        console.warn("没有获取到任何类别定义");
      }
    })
    .catch((error) => {
      console.error("获取类别定义失败", error);
    })
    .finally(() => {
      setTimeout(() => {
        loading.close();
      }, 400);
    });
}

function createBlockCategoryByJSON(categoryJSON) {
  let varInputs = categoryJSON.var_input.map(
    (v) => new VarConf(v.name, v.type, v.description)
  );
  let signalInputs = categoryJSON.signal_input.map(
    (s) => new SignalConf(s.name, s.description)
  );
  let varOutputs = categoryJSON.var_output.map(
    (v) => new VarConf(v.name, v.type, v.description)
  );
  let signalOutputs = categoryJSON.signal_output.map(
    (s) => new SignalConf(s.name, s.description)
  );
  let internalVars = categoryJSON.InternalVars.map(
    (v) => new VarConf(v.name, v.type, v.intialValue, v.description)
  );
  let ECStates = [];
  categoryJSON.ECC.ECStates.forEach((state) => {
    let ECAtion = null;
    if (state.ecAction) {
      ECAtion = new ECAction(state.ecAction.alogorithm, state.ecAction.output);
    }
    ECStates.push(
      new ECState(state.name, state.comment, state.x, state.y, ECAtion)
    );
  });
  let ECTransitions = categoryJSON.ECC.ECTransitions.map(
    (t) =>
      new ECTransition(
        t.source,
        t.destination,
        t.condition,
        t.comment,
        t.x,
        t.y
      )
  );
  let ECC = {
    ECStates: ECStates,
    ECTransitions: ECTransitions,
  };
  let Algorithms = categoryJSON.Algorithms.map(
    (a) => new AlgorithmConf(a.Name, a.Comment, a.Input, a.Output, a.Code)
  );
  let category = new CategoryConf(
    categoryJSON.name,
    varInputs,
    varOutputs,
    signalInputs,
    signalOutputs,
    internalVars,
    ECC,
    Algorithms,
    categoryJSON.description
  );
  return category;
}

function safeGet(list, index) {
  return index >= 0 && index < list.length ? list[index] : null;
}

function getWorkspace() {
  // 序列化当前工作区状态
  const workspace = {
    version: "1.0",
    timestamp: Date.now(),
    canvas: {
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value,
    },
    // 保存类别定义
    blockCategories: blockCategories.value.map((category) => ({
      name: category.name,
      description: category.description,
      icon: category.icon,
      signal_input: category.signal_input.map((signal) => ({
        name: signal.name,
        description: signal.description,
      })),
      signal_output: category.signal_output.map((signal) => ({
        name: signal.name,
        description: signal.description,
      })),
      var_input: category.var_input.map((variable) => ({
        name: variable.name,
        type: variable.type,
        description: variable.description,
      })),
      var_output: category.var_output.map((variable) => ({
        name: variable.name,
        type: variable.type,
        description: variable.description,
      })),
    })),
    blocks: placedBlocks.value.map((block) => ({
      id: block.id,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      categoryName: block.categoryConf.name,
      categoryIndex: block.categoryIndex,
      categoryConf: {
        name: block.categoryConf.name,
        signal_input: block.categoryConf.signal_input.map((signal) => ({
          name: signal.name,
          description: signal.description,
        })),
        signal_output: block.categoryConf.signal_output.map((signal) => ({
          name: signal.name,
          description: signal.description,
        })),
        var_input: block.categoryConf.var_input.map((variable) => ({
          name: variable.name,
          type: variable.type,
          description: variable.description,
        })),
        var_output: block.categoryConf.var_output.map((variable) => ({
          name: variable.name,
          type: variable.type,
          description: variable.description,
        })),
        description: block.categoryConf.description,
        icon: block.categoryConf.icon,
      },
    })),
    connections: connections.value.map((connection) => ({
      id: connection.id,
      type: connection.type,
      start: {
        blockId: connection.start.blockId,
        type: connection.start.type,
        index: connection.start.index,
      },
      end: {
        blockId: connection.end.blockId,
        type: connection.end.type,
        index: connection.end.index,
      },
    })),
  };

  return workspace;
}

function loadWorkspace(workspace) {
  try {
    // 清空当前工作区
    clearWorkspace(false);

    const blockData = workspace.blocks || [];
    const connectionData = workspace.connections || [];
    const canvasData = workspace.canvas || {};
    const categoryData = workspace.blockCategories || [];

    console.log("加载工作区数据", {
      blockData,
      connectionData,
      canvasData,
      categoryData,
    });

    // 1. 首先恢复类别定义
    if (categoryData.length > 0) {
      blockCategories.value = [];
      categoryData.forEach((categoryInfo) => {
        try {
          const category = new CategoryConf(
            categoryInfo.name,
            categoryInfo.var_input.map(
              (v) => new VarConf(v.name, v.type, v.description)
            ),
            categoryInfo.var_output.map(
              (v) => new VarConf(v.name, v.type, v.description)
            ),
            categoryInfo.signal_input.map(
              (s) => new SignalConf(s.name, s.description)
            ),
            categoryInfo.signal_output.map(
              (s) => new SignalConf(s.name, s.description)
            ),
            categoryInfo.description,
            categoryInfo.icon
          );
          blockCategories.value.push(category);
          console.log(`恢复类别定义: ${category.name}`);
        } catch (error) {
          console.error("恢复类别定义失败:", categoryInfo, error);
        }
      });
    } else {
      // 如果没有保存的类别数据，使用默认类别
      console.log("未找到保存的类别数据，使用默认类别");
      getBlockCategories();
    }

    // 重建块映射表，用于快速查找
    const blockMap = new Map();

    // 2. 重建所有块
    blockData.forEach((blockInfo) => {
      try {
        // 查找对应的类别定义
        let categoryConf;
        if (
          blockInfo.categoryIndex !== undefined &&
          blockInfo.categoryIndex >= 0 &&
          blockInfo.categoryIndex < blockCategories.value.length
        ) {
          // 使用索引查找类别
          categoryConf = blockCategories.value[blockInfo.categoryIndex];
        } else {
          // 使用名称查找类别
          categoryConf = blockCategories.value.find(
            (cat) => cat.name === blockInfo.categoryName
          );
        }

        if (!categoryConf) {
          // 如果找不到对应类别，从保存的数据重建
          console.warn(`找不到类别 ${blockInfo.categoryName}，从块数据重建`);
          categoryConf = new CategoryConf(
            blockInfo.categoryConf.name,
            blockInfo.categoryConf.var_input.map(
              (v) => new VarConf(v.name, v.type, v.description)
            ),
            blockInfo.categoryConf.var_output.map(
              (v) => new VarConf(v.name, v.type, v.description)
            ),
            blockInfo.categoryConf.signal_input.map(
              (s) => new SignalConf(s.name, s.description)
            ),
            blockInfo.categoryConf.signal_output.map(
              (s) => new SignalConf(s.name, s.description)
            ),
            blockInfo.categoryConf.description,
            blockInfo.categoryConf.icon
          );
        }

        // 创建新块实例
        const block = new Block(
          blockInfo.x,
          blockInfo.y,
          Block.PLACE_STATE.placed,
          categoryConf
        );

        // 使用原始ID（重要：保持引用一致性）
        block.id = blockInfo.id;

        // 设置其他属性
        block.width = blockInfo.width;
        block.height = blockInfo.height;

        // 确保连接器状态正确初始化
        block.initializeConnectors();

        placedBlocks.value.push(block);
        blockMap.set(block.id, block);

        console.log(`重建块: ${block.id} (${block.categoryConf.name})`);
      } catch (error) {
        console.error("重建块失败:", blockInfo, error);
      }
    });

    // 3. 重建所有连接
    connectionData.forEach((connInfo) => {
      try {
        const startBlock = blockMap.get(connInfo.start.blockId);
        const endBlock = blockMap.get(connInfo.end.blockId);

        if (!startBlock || !endBlock) {
          console.error("找不到连接的块:", connInfo);
          return;
        }

        // 验证连接器索引有效性
        const startConnectors = startBlock.categoryConf[connInfo.start.type];
        const endConnectors = endBlock.categoryConf[connInfo.end.type];

        if (
          !startConnectors ||
          connInfo.start.index >= startConnectors.length
        ) {
          console.error("无效的起始连接器:", connInfo.start);
          return;
        }

        if (!endConnectors || connInfo.end.index >= endConnectors.length) {
          console.error("无效的目标连接器:", connInfo.end);
          return;
        }

        // 检查目标连接器是否已被占用（输入连接器只能有一个连接）
        if (connInfo.end.type.includes("input")) {
          if (
            endBlock.connectors[connInfo.end.type][connInfo.end.index].connected
          ) {
            console.warn(
              `目标连接器已被占用: ${connInfo.end.blockId}.${connInfo.end.type}[${connInfo.end.index}]`
            );
            return;
          }
        }

        // 创建连接对象，使用正确的响应式计算属性
        const connection = {
          id: connInfo.id,
          type: connInfo.type,
          start: connInfo.start,
          end: connInfo.end,
          // 重新创建响应式位置计算 - 确保引用正确的块实例
          startPosition: computed(() => {
            // 重新查找块以确保响应式更新
            const currentStartBlock = placedBlocks.value.find(
              (b) => b.id === connInfo.start.blockId
            );
            if (!currentStartBlock) return { x: 0, y: 0 };
            const pos = getConnectorPosition(
              currentStartBlock,
              connInfo.start.type,
              connInfo.start.index
            );
            return pos.value;
          }),
          endPosition: computed(() => {
            // 重新查找块以确保响应式更新
            const currentEndBlock = placedBlocks.value.find(
              (b) => b.id === connInfo.end.blockId
            );
            if (!currentEndBlock) return { x: 0, y: 0 };
            const pos = getConnectorPosition(
              currentEndBlock,
              connInfo.end.type,
              connInfo.end.index
            );
            return pos.value;
          }),
        };

        connections.value.push(connection);

        // 正确更新块的连接状态
        // 更新起始块（输出连接器）
        if (connInfo.start.type.includes("output")) {
          const startConnector =
            startBlock.connectors[connInfo.start.type][connInfo.start.index];
          startConnector.connected = true;
          if (!startConnector.connectionIds) {
            startConnector.connectionIds = [];
          }
          startConnector.connectionIds.push(connInfo.id);
        }

        // 更新目标块（输入连接器）
        if (connInfo.end.type.includes("input")) {
          const endConnector =
            endBlock.connectors[connInfo.end.type][connInfo.end.index];
          endConnector.connected = true;
          endConnector.connectionId = connInfo.id;
        }

        console.log(
          `重建连接: ${connInfo.id} (${connInfo.start.blockId} -> ${connInfo.end.blockId})`
        );
      } catch (error) {
        console.error("重建连接失败:", connInfo, error);
      }
    });

    // 验证连接状态
    console.log("验证连接状态:");
    placedBlocks.value.forEach((block) => {
      console.log(`块 ${block.id} 连接状态:`, block.connectors);
    });

    // 4. 恢复画布状态
    if (canvasData.scale !== undefined) {
      scale.value = canvasData.scale;
    }
    if (canvasData.offsetX !== undefined) {
      offsetX.value = canvasData.offsetX;
    }
    if (canvasData.offsetY !== undefined) {
      offsetY.value = canvasData.offsetY;
    }

    // 5. 更新连接计数器，避免ID冲突
    if (connectionData.length > 0) {
      const maxConnectionId = Math.max(
        ...connectionData.map((conn) => {
          // 修正正则表达式以匹配 "connection_NUMBER" 格式

          const match = conn.id.match(/^connection_(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
      );
      connectionIdCounter = maxConnectionId;
    } else {
      connectionIdCounter = 0; // 如果没有连接，重置计数器
    }

    // 6. 更新块ID计数器
    if (blockData.length > 0) {
      const maxBlockId = Math.max(
        ...blockData.map((block) => {
          const match = block.id.match(/block_(\d+)_/);
          return match ? parseInt(match[1]) : 0;
        })
      );
      Block._idCounter = maxBlockId;
    } else {
      Block._idCounter = 0; // 如果没有块，重置计数器
    }

    // 7. 清除选中状态，确保界面正确更新
    selectedBlock.value = null;
    selectedBlocks.value.clear();
    selectedConnection.value = null;
    selectedConnections.value.clear();

    console.log(
      `工作区加载完成: ${categoryData.length} 个类别, ${blockData.length} 个块, ${connectionData.length} 个连接`
    );

    // 强制触发响应式更新
    placedBlocks.value = [...placedBlocks.value];
    connections.value = [...connections.value];

    return true;
  } catch (error) {
    console.error("加载工作区失败:", error);
    // 发生错误时清空工作区并恢复默认类别
    clearWorkspace(false);
    getBlockCategories();
    return false;
  }
}

defineExpose({
  resetCanvas: adjustCanvas,
  zoomIn,
  zoomOut,
  getWorkspace,
  loadWorkspace,
  clearWorkspace,
  clearWorkspaceValid,
  scale,
});
</script>

<style scoped>
.aside-toggle-button .icon {
  width: 14px;
  /* 调整图标大小 */
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
  flex: 1;
  /* 占据剩余空间 */
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
  position: relative;
  /* 保持 relative 以便绝对定位的子元素（如toggle button）*/
  overflow: hidden;
  flex: 1;
  padding: 0;
  display: flex;
  /* 使 home-aside 和 canvas-container 水平排列 */
}

/* 新增：平移状态下的光标样式 */
.main-container.panning {
  cursor: grabbing !important;
  /* 确保在平移时始终为抓取光标 */
}
</style>
