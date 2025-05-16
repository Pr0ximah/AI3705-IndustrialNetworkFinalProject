<template>
  <ElContainer class="home-container">
    <ElHeader height="20px" class="container-header">
      <div>Home</div>
    </ElHeader>

    <!-- ElMain 作为 drop zone -->
    <ElMain
      ref="mainRef"
      @mouseup="onMouseUp"
      @mousemove="onMouseMove"
      class="container-main"
      style="position: relative; overflow: hidden"
    >
      <!-- 网格背景 -->
      <div class="grid-background"></div>

      <!-- 所有可拖拽的块统一渲染 -->
      <div
        v-for="(block, index) in allBlocks"
        :key="'block-' + index"
        :style="{
          left: block.x + 'px',
          top: block.y + 'px',
          width: block.width + 'px',
          height: block.height + 'px',
          backgroundColor: block.color,
          position: 'absolute',
          cursor: draggingBlock === block ? 'grabbing' : 'grab',
        }"
        @mousedown="startDrag(block, $event)"
        class="drag-block"
        :class="{ snap: isSnapped && draggingBlock === block }"
      ></div>
    </ElMain>
  </ElContainer>
</template>

<script setup>
import { ref, computed } from "vue";
import { ElContainer, ElHeader, ElMain } from "element-plus";

// 可拖动块的放置状态
const BLOCK_PLACE_STATE = {
  original: "original",
  placed: "placed",
};

// 块原始参数
const BLOCK_PARAMS = {
  width: 80,
  height: 80,
};

// 创建块的函数
function createBlock(x, y, place_state, category = "1") {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F", "#8E44AD"];
  let type_id = 0;
  switch (category) {
    default:
      type_id = 0;
  }
  return {
    x: x,
    y: y,
    width: BLOCK_PARAMS.width,
    height: BLOCK_PARAMS.height,
    color: colors[type_id],
    place_state: place_state,
  };
}

// 原始块
const originalBlocks = [createBlock(0, 0, BLOCK_PLACE_STATE.original)];

// 已放置的块
const placedBlocks = ref([]);

// 合并所有块
const allBlocks = computed(() => [...originalBlocks, ...placedBlocks.value]);

// 当前正在拖动的块
const draggingBlock = ref(null);

// 是否触发了吸附
const isSnapped = ref(false);

// 主容器引用
const mainRef = ref(null);

// 网格大小
const gridSize = 20;

function startDrag(block, _event) {
  if (block.place_state === BLOCK_PLACE_STATE.original) {
    const newBlock = createBlock(
      block.x,
      block.y,
      block.width,
      block.height,
      block.category,
      BLOCK_PLACE_STATE.placed
    );
    placedBlocks.value.push(newBlock);
    draggingBlock.value = newBlock;
  } else {
    draggingBlock.value = block;
  }
}

function calCenter(corner_x, corner_y) {
  return {
    x: corner_x + BLOCK_PARAMS.width / 2,
    y: corner_y + BLOCK_PARAMS.height / 2,
  };
}

function hasOverlap(x1, x2, y1, y2) {
  return (
    x1 < x2 + BLOCK_PARAMS.width &&
    x1 + BLOCK_PARAMS.width > x2 &&
    y1 < y2 + BLOCK_PARAMS.height &&
    y1 + BLOCK_PARAMS.height > y2
  );
}

// function onMouseMove(event) {
//   if (!draggingBlock.value) return;

//   const rect = mainRef.value.$el.getBoundingClientRect();
//   let offsetX = event.clientX - rect.left;
//   let offsetY = event.clientY - rect.top;

//   // 初始坐标（带网格吸附）
//   let newX =
//     Math.round((offsetX - BLOCK_PARAMS.width / 2) / gridSize) * gridSize;
//   let newY =
//     Math.round((offsetY - BLOCK_PARAMS.height / 2) / gridSize) * gridSize;

//   isSnapped.value = false;

//   let finalX = newX;
//   let finalY = newY;

//   let draggingBlockCenter = calCenter(finalX, finalY);
//   let snapBlockList = [];

//   for (const otherBlock of allBlocks.value) {
//     if (otherBlock === draggingBlock.value) continue; // 自己不吸附
//     if (otherBlock.place_state === BLOCK_PLACE_STATE.original) continue; // 原始块不参与吸附

//     const threshold = 40; // 吸附阈值
//     const spacing = 5; // 吸附间距

//     // 计算距离
//     const otherBlockCenter = calCenter(otherBlock.x, otherBlock.y);
//     // const margins = [
//     //   draggingBlockCenter.x - otherBlockCenter.x - BLOCK_PARAMS.width,  // 右
//     //   draggingBlockCenter.y - otherBlockCenter.y - BLOCK_PARAMS.height, // 下
//     //   otherBlockCenter.x - draggingBlockCenter.x - BLOCK_PARAMS.width,  // 左
//     //   otherBlockCenter.y - draggingBlockCenter.y - BLOCK_PARAMS.height, // 上
//     // ];
//     const diffVec = [
//       draggingBlockCenter.x - otherBlockCenter.x,
//       draggingBlockCenter.y - otherBlockCenter.y,
//     ];
//     // let snapDist = 0;
//     if (
//       Math.abs(diffVec[0]) < BLOCK_PARAMS.width + threshold &&
//       Math.abs(diffVec[1]) < BLOCK_PARAMS.height + threshold
//     ) {
//       isSnapped.value = true;
//       if (Math.abs(diffVec[0]) > Math.abs(diffVec[1])) {
//         // 吸附到左或右
//         if (diffVec[0] > 0) {
//           finalX = otherBlock.x + BLOCK_PARAMS.width + spacing;
//         } else {
//           finalX = otherBlock.x - BLOCK_PARAMS.width - spacing;
//         }
//         // snapDist = Math.abs(diffVec[0]);
//         finalY = otherBlock.y;
//       } else {
//         // 吸附到上或下
//         if (diffVec[1] > 0) {
//           finalY = otherBlock.y + BLOCK_PARAMS.height + spacing;
//         } else {
//           finalY = otherBlock.y - BLOCK_PARAMS.height - spacing;
//         }
//         // snapDist = Math.abs(diffVec[1]);
//         finalX = otherBlock.x;
//       }
//     }
//     if (isSnapped.value) {
//       snapBlockList.push({
//         actualDist: Math.sqrt(
//           Math.pow(draggingBlockCenter.x - otherBlockCenter.x, 2) +
//             Math.pow(draggingBlockCenter.y - otherBlockCenter.y, 2)
//         ),
//         finalX: finalX,
//         finalY: finalY,
//       });
//     }
//   }

//   // 选择距离最近的块;
//   let minDist = Number.MAX_VALUE;
//   for (const snapBlock of snapBlockList) {
//     if (snapBlock.actualDist < minDist) {
//       minDist = snapBlock.actualDist;
//       finalX = snapBlock.finalX;
//       finalY = snapBlock.finalY;
//     }
//   }

//   // 更新块的位置
//   draggingBlock.value.x = finalX;
//   draggingBlock.value.y = finalY;
// }

function onMouseMove(event) {
  if (!draggingBlock.value) return;

  const rect = mainRef.value.$el.getBoundingClientRect();
  let offsetX = event.clientX - rect.left;
  let offsetY = event.clientY - rect.top;

  // 初始坐标（带网格吸附）
  let newX =
    Math.round((offsetX - BLOCK_PARAMS.width / 2) / gridSize) * gridSize;
  let newY =
    Math.round((offsetY - BLOCK_PARAMS.height / 2) / gridSize) * gridSize;

  isSnapped.value = false;

  let finalX = newX;
  let finalY = newY;

  let draggingBlockCenter = calCenter(finalX, finalY);
  let snapBlockList = [];

  for (const otherBlock of allBlocks.value) {
    if (otherBlock === draggingBlock.value) continue; // 自己不吸附
    if (otherBlock.place_state === BLOCK_PLACE_STATE.original) continue; // 原始块不参与吸附

    const threshold = 40; // 吸附阈值
    const spacing = 5; // 吸附间距

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
      Math.abs(diffVec[0]) < BLOCK_PARAMS.width + threshold &&
      Math.abs(diffVec[1]) < BLOCK_PARAMS.height + threshold
    ) {
      if (Math.abs(diffVec[0]) > Math.abs(diffVec[1])) {
        // 吸附到左或右
        if (diffVec[0] > 0) {
          potentialFinalX = otherBlock.x + BLOCK_PARAMS.width + spacing;
        } else {
          potentialFinalX = otherBlock.x - BLOCK_PARAMS.width - spacing;
        }
        potentialFinalY = otherBlock.y;
        willSnap = true;
      } else {
        // 吸附到上或下
        if (diffVec[1] > 0) {
          potentialFinalY = otherBlock.y + BLOCK_PARAMS.height + spacing;
        } else {
          potentialFinalY = otherBlock.y - BLOCK_PARAMS.height - spacing;
        }
        potentialFinalX = otherBlock.x;
        willSnap = true;
      }

      // 检查这个吸附位置是否会导致与任何其他块重叠
      let hasOverlapWithOthers = false;
      if (willSnap) {
        for (const checkBlock of allBlocks.value) {
          if (checkBlock === draggingBlock.value || checkBlock === otherBlock)
            continue;
          // if (checkBlock.place_state === BLOCK_PLACE_STATE.original) continue;
          if (
            hasOverlap(
              potentialFinalX,
              checkBlock.x,
              potentialFinalY,
              checkBlock.y
            )
          ) {
            hasOverlapWithOthers = true;
            break;
          }
        }
      }

      if (willSnap && !hasOverlapWithOthers) {
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

  // 选择距离最近的块;
  let minDist = Number.MAX_VALUE;
  for (const snapBlock of snapBlockList) {
    if (snapBlock.actualDist < minDist) {
      minDist = snapBlock.actualDist;
      finalX = snapBlock.finalX;
      finalY = snapBlock.finalY;
    }
  }

  // 更新块的位置
  draggingBlock.value.x = finalX;
  draggingBlock.value.y = finalY;
}

function onMouseUp() {
  draggingBlock.value = null;
  isSnapped.value = false;
}
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.container-main {
  position: relative;
}

/* 点阵网格背景 */
.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(#ccc 1px, transparent 1px);
  background-size: 20px 20px;
  z-index: 0;
  pointer-events: none;
}

.drag-block {
  z-index: 1;
  transition: none;
  border-radius: 4px;
  user-select: none;
}

/* 吸附样式 */
.drag-block.snap {
  outline: 2px dashed red;
}
</style>
