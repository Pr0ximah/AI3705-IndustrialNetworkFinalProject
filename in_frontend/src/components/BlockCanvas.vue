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
    <div class="home-aside" :style="asideStyle" @wheel="onSidebarWheel">
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
    <div ref="canvasContainerRef" class="canvas-container">
      <!-- SVG连线层 - 移到 canvas-container 层级 -->
      <svg class="connections-layer">
        <!-- 已建立的连接线 -->
        <path
          v-for="connection in connections"
          :key="connection.id"
          :d="getConnectionPath(connection)"
          class="connection-line"
          :class="{ selected: selectedConnection === connection }"
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
            selected: selectedBlock === block,
            dragging: draggingBlock === block,
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
} from "vue";
import { CategoryConf, VarConf } from "./BlockBaseConf";
import { ElMessageBox } from "element-plus";
import { Delete, DArrowLeft, DArrowRight } from "@element-plus/icons-vue";
import equipment from "@/assets/equipment.svg";

const DRAG_THRESHOLD = 3; // 拖拽阈值：鼠标移动超过5像素才触发拖拽
const BLOCK_COLOR_MAP = ["#f9b4ab", "#fdebd3", "#264e70", "#679186", "#bbd4ce"]; // 块颜色映射
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

// 当前鼠标位置（用于连接线绘制）
const currentMouseX = ref(0);
const currentMouseY = ref(0);

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

// 拖拽状态相关
const isDragStarted = ref(false); // 是否已经开始拖拽
const dragStartX = ref(0); // 拖拽开始时的鼠标X坐标
const dragStartY = ref(0); // 拖拽开始时的鼠标Y坐标
const potentialDragBlock = ref(null); // 潜在拖拽块（点击但还未达到拖拽阈值）

// 当前选中的块
const selectedBlock = ref(null);

// 画布容器引用
const canvasContainerRef = ref(null);

// 删除区域引用和状态
const deleteZoneRef = ref(null);
const isOverDelete = ref(false);

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
  const lineBlockSpacing = 4; // 连接器与块边界的间距
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
function clearWorkspace() {
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
    // 如果点击画布空白区域，清除选中
    if (!isMouseOverBlock(event)) {
      selectedBlock.value = null;

      // 如果按住Shift键且不在侧边栏区域，则开始平移画布
      if (event.shiftKey && !isMouseOverSidebar(event)) {
        isPanning.value = true;
        lastMouseX.value = event.clientX;
        lastMouseY.value = event.clientY;
        event.preventDefault();
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
  const zoomFactor = event.deltaY < 0 ? 0.025 : -0.025;

  // 使用鼠标位置作为缩放中心点
  zoom(zoomFactor, event.clientX, event.clientY);
}

// 鼠标移出事件
function onMouseLeave(event) {
  // 停止平移
  if (isPanning.value) {
    isPanning.value = false;
  }

  // 如果鼠标移出主容器且正在拖拽，继续跟踪鼠标
  if (draggingBlock.value || potentialDragBlock.value) {
    // 保持拖拽状态，让全局鼠标事件处理
    return;
  }
}

// 选中块
function selectBlock(block, event) {
  // 阻止事件冒泡，防止触发画布的click事件
  event.stopPropagation();
  selectedBlock.value = block;
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
  } else {
    potentialDragBlock.value = block;
    selectedBlock.value = block; // 选中正在拖拽的块
  }
  event.stopPropagation(); // 防止触发画布拖拽
}

function onMouseMove(event) {
  // 更新鼠标位置（用于连接线绘制）
  if (isConnecting.value) {
    updateMousePosition(event);
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

    // 移除边界检查，允许自由移动

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
  let newX = mouseXInCanvas - Block.PARAMS.width / 2;
  let newY = mouseYInCanvas - Block.PARAMS.height / 2;

  // 移除拖动边界限制，允许块在画布外放置
  // newX = Math.max(0, Math.min(canvasWidth.value - Block.PARAMS.width, newX));
  // newY = Math.max(0, Math.min(canvasHeight.value - Block.PARAMS.height, newY));

  // 跟随鼠标移动
  draggingBlock.value.x = newX;
  draggingBlock.value.y = newY;

  let finalX = newX;
  let finalY = newY;

  // 最终检查确保移动合法 (如果不在删除区域上)
  if (!isOverDelete.value) {
    // 更新块的位置
    draggingBlock.value.x = finalX;
    draggingBlock.value.y = finalY;
  } else if (isOverDelete.value) {
    draggingBlock.value.x = newX;
    draggingBlock.value.y = newY;
  }
}

function onMouseUp() {
  // 如果正在连接但没有结束在有效目标上，取消连接
  if (isConnecting.value) {
    isConnecting.value = false;
    connectingStart.value = null;
  }

  if (draggingBlock.value && isOverDelete.value) {
    // 删除块
    deleteBlock(draggingBlock.value);
    if (selectedBlock.value === draggingBlock.value) {
      selectedBlock.value = null;
    }
    draggingBlock.value = null;
    potentialDragBlock.value = null;
    isOverDelete.value = false;
    isDragStarted.value = false;
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
}

// 创建连接
function createConnection(start, end) {
  const connectionId = `connection_${++connectionIdCounter}`;

  const connection = {
    id: connectionId,
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
  start.block.connectors[start.type][start.index].connectionIds.push(
    connectionId
  );
  end.block.connectors[end.type][end.index].connected = true;
  end.block.connectors[end.type][end.index].connectionId = connectionId;
}

// 删除连接
function deleteConnection(connection) {
  const startBlock = placedBlocks.value.find(
    (b) => b.id === connection.start.blockId
  );
  const endBlock = placedBlocks.value.find(
    (b) => b.id === connection.end.blockId
  );

  // 更新块的连接状态
  if (startBlock) {
    const connectionIds =
      startBlock.connectors[connection.start.type][connection.start.index]
        .connectionIds;
    const index = connectionIds.indexOf(connection.id);
    if (index > -1) {
      connectionIds.splice(index, 1);
    }
  }

  if (endBlock) {
    endBlock.connectors[connection.end.type][
      connection.end.index
    ].connected = false;
    endBlock.connectors[connection.end.type][
      connection.end.index
    ].connectionId = null;
  }

  // 从连接数组中移除
  const connectionIndex = connections.value.findIndex(
    (c) => c.id === connection.id
  );
  if (connectionIndex > -1) {
    connections.value.splice(connectionIndex, 1);
  }
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
  selectedConnection.value = connection;
  selectedBlock.value = null; // 清除块选择
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

// 更新鼠标位置（画布坐标系）
function updateMousePosition(event) {
  const rect = canvasContainerRef.value.getBoundingClientRect();
  currentMouseX.value =
    (event.clientX - rect.left - offsetX.value) / scale.value;
  currentMouseY.value =
    (event.clientY - rect.top - offsetY.value) / scale.value;
}

// 清除选中
function clearSelection() {
  selectedBlock.value = null;
  selectedConnection.value = null;
}

// 键盘事件处理函数
function handleKeyDown(event) {
  // Delete键删除选中的块或连接
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedBlock.value) {
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
    selectedConnection.value = null;
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
  if (type.includes("input") && !block.connectors[type][index].connected) {
    // 检查连接类型是否匹配（信号对信号，变量对变量）
    const startIsSignal = connectingStart.value.type.includes("signal");
    const targetIsSignal = type.includes("signal");

    if (
      startIsSignal === targetIsSignal &&
      connectingStart.value.block !== block
    ) {
      // 创建连接
      createConnection(
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
}

// 生成连接线的 SVG 路径（横平竖直）
function getConnectionPath(connection) {
  return computed(() => {
    // 获取实时的连接器位置
    const start = connection.startPosition;
    const end = connection.endPosition;

    // 转换为屏幕坐标
    const x1 = start.x * scale.value + offsetX.value;
    const y1 = start.y * scale.value + offsetY.value;
    const x2 = end.x * scale.value + offsetX.value;
    const y2 = end.y * scale.value + offsetY.value;

    // 计算中间点，创建横平竖直的路径
    const midX = x1 + (x2 - x1) * 0.5;

    // 创建路径：从起点水平移动到中点，然后垂直移动到终点高度，最后水平移动到终点
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }).value;
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

    // 计算中间点
    const midX = x1 + (x2 - x1) * 0.5;

    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }).value;
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);

  // 初始化画布（只在启动时执行一次）
  initializeCanvas();

  // 获取所有类别定义
  getBlockCategories();
});

// 在组件卸载时移除键盘事件监听器
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

function getBlockCategories() {
  const var1 = new VarConf("poweron", "bool", "是否启用");
  const var2 = new VarConf("poweroff", "bool", "是否关闭");
  const category1 = new CategoryConf(
    "传送带",
    [var1],
    [var2],
    [1, 3],
    [2],
    "传输货物"
  );
  blockCategories.value.push(category1);
}

function safeGet(list, index) {
  return index >= 0 && index < list.length ? list[index] : null;
}

function getPlacedBlockList() {
  return placedBlocks.value;
}

// 暴露接口
defineExpose({
  resetCanvas: adjustCanvas,
  zoomIn,
  zoomOut,
  clearWorkspace,
  getPlacedBlockList,
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
