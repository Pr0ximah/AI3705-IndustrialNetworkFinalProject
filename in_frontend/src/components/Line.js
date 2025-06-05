const LINE_SPACING = 10; // 连接线间距
const CONNECTOR_EXTENSION = 30; // 连接器延伸长度
const BLOCK_AVOID_MARGIN = 15; // 块避让边距

// 全局计数器，用于线的创建顺序
let globalLineCounter = 0;

// 全局线管理器
class LineManager {
  constructor() {
    this.lines = new Set();
  }

  addLine(line) {
    this.lines.add(line);
  }

  removeLine(line) {
    if (this.lines.has(line)) {
      this.lines.delete(line);
    }
  }

  getExistingLines(excludeLine = null) {
    return Array.from(this.lines).filter((line) => line !== excludeLine);
  }

  clear() {
    this.lines.clear();
    // 清空时重置计数器
    globalLineCounter = 0;
  }
}

// 全局实例
const lineManager = new LineManager();

class Segment {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.isHorizontal = Math.abs(y1 - y2) < 1;
    this.isVertical = Math.abs(x1 - x2) < 1;
    this.length = this.isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    this.fixed = false; // 是否固定线段位置
  }
}

class Line {
  constructor(
    startX,
    startY,
    endX,
    endY,
    startBlock = null,
    endBlock = null,
    scale = 1,
    offsetX = 0,
    offsetY = 0,
    addToManager = true
  ) {
    // startX, startY, endX, endY are expected to be canvas coordinates
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
    this.scale = scale; // Scale for rendering
    this.offsetX = offsetX; // Offset for rendering
    this.offsetY = offsetY; // Offset for rendering
    this.segments = [];

    // 添加唯一标识符和创建顺序，用于避让优先级
    this.id = Math.random().toString(36).substring(2, 11);
    this.creationOrder = globalLineCounter++;

    this.calculatePath();

    if (addToManager) {
      // 将线添加到管理器
      lineManager.addLine(this);
    }
  }

  // 销毁线时从管理器中移除
  destroy() {
    lineManager.removeLine(this);
  }

  updatePosition(
    startX,
    startY,
    endX,
    endY,
    scale = 1, // scale, offsetX, offsetY are for rendering context
    offsetX = 0,
    offsetY = 0
  ) {
    // startX, startY, endX, endY are expected to be canvas coordinates
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.calculatePath();
  }

  calculatePath() {
    // 使用画布坐标进行计算
    const x1 = this.startX;
    const y1 = this.startY;
    const x2 = this.endX;
    const y2 = this.endY;

    // 如果没有块信息或输出在输入左边，使用简单路径
    // Note: x1 < x2 comparison is in canvas coordinates
    if (!this.startBlock || !this.endBlock || x1 < x2) {
      this.segments = this.createSimplePath(x1, y1, x2, y2);
      return;
    }

    // 使用避让算法计算路径
    this.segments = this.calculateAvoidancePath(x1, y1, x2, y2);
  }

  createSimplePath(x1, y1, x2, y2) {
    // x1, y1, x2, y2 are canvas coordinates
    const midX = x1 + (x2 - x1) * 0.5;

    const basePath = [
      new Segment(x1, y1, midX, y1),
      new Segment(midX, y1, midX, y2),
      new Segment(midX, y2, x2, y2),
    ];

    // 简单路径只应用y方向的避让，不改变头尾点坐标
    return this.applySimpleLineAvoidance(basePath, x1, y1, x2, y2);
  }

  calculateAvoidancePath(x1, y1, x2, y2) {
    // x1, y1, x2, y2 are canvas coordinates
    if (!this.startBlock || !this.endBlock) {
      return this.createSimplePath(x1, y1, x2, y2);
    }

    // 块坐标已经是画布坐标
    const startBlockCanvasX = this.startBlock.x;
    const startBlockCanvasY = this.startBlock.y;
    const startBlockCanvasWidth = this.startBlock.width;
    const startBlockCanvasHeight = this.startBlock.height;

    const endBlockCanvasX = this.endBlock.x;
    const endBlockCanvasY = this.endBlock.y;
    const endBlockCanvasWidth = this.endBlock.width;
    const endBlockCanvasHeight = this.endBlock.height;

    // 常量 CONNECTOR_EXTENSION, BLOCK_AVOID_MARGIN 被视为画布单位
    const connExtend = CONNECTOR_EXTENSION;
    const safeDist = BLOCK_AVOID_MARGIN;
    const startX = x1 + connExtend; // Canvas coordinates
    const endX = x2 - connExtend; // Canvas coordinates

    // 计算两个块的避让区域（包含安全边距），使用画布坐标
    const startBlockAvoidArea = {
      left: startBlockCanvasX - safeDist,
      right: startBlockCanvasX + startBlockCanvasWidth + safeDist,
      top: startBlockCanvasY - safeDist,
      bottom: startBlockCanvasY + startBlockCanvasHeight + safeDist,
    };

    const endBlockAvoidArea = {
      left: endBlockCanvasX - safeDist,
      right: endBlockCanvasX + endBlockCanvasWidth + safeDist,
      top: endBlockCanvasY - safeDist,
      bottom: endBlockCanvasY + endBlockCanvasHeight + safeDist,
    };

    // 检查X轴是否需要绕行 (画布坐标比较)
    const needXBypass =
      startX > Math.min(startBlockAvoidArea.left, endBlockAvoidArea.left) &&
      endX < Math.max(startBlockAvoidArea.right, endBlockAvoidArea.right);

    let basePath;
    if (!needXBypass) {
      // X轴不需要绕行，直接连接
      basePath = [
        new Segment(x1, y1, startX, y1),
        new Segment(startX, y1, startX, y2),
        new Segment(startX, y2, endX, y2),
        new Segment(endX, y2, x2, y2),
      ];
    } else {
      // X轴需要绕行，检查是否可以从两个块之间穿过
      const canPassBetween = this.checkCanPassBetween(
        startBlockAvoidArea,
        endBlockAvoidArea,
        y1, // canvas y1
        y2, // canvas y2
        40 // minPassageHeight in canvas units (assuming 40 is canvas units)
      );

      if (canPassBetween.canPass) {
        // 可以从中间穿过
        const passageY = canPassBetween.passageY;
        basePath = [
          new Segment(x1, y1, startX, y1),
          new Segment(startX, y1, startX, passageY),
          new Segment(startX, passageY, endX, passageY),
          new Segment(endX, passageY, endX, y2),
          new Segment(endX, y2, x2, y2),
        ];
      } else {
        // 不能从中间穿过，需要上下绕行
        const combinedAvoidArea = {
          left: Math.min(startBlockAvoidArea.left, endBlockAvoidArea.left),
          right: Math.max(startBlockAvoidArea.right, endBlockAvoidArea.right),
          top: Math.min(startBlockAvoidArea.top, endBlockAvoidArea.top),
          bottom: Math.max(
            startBlockAvoidArea.bottom,
            endBlockAvoidArea.bottom
          ),
        };

        // 决定绕行方向：上方还是下方
        const centerY = (y1 + y2) / 2;
        let bypassY;
        const distanceToTop = Math.abs(centerY - combinedAvoidArea.top);
        const distanceToBottom = Math.abs(centerY - combinedAvoidArea.bottom);

        if (distanceToTop < distanceToBottom) {
          // 从上方绕行
          bypassY = combinedAvoidArea.top;
        } else {
          // 从下方绕行
          bypassY = combinedAvoidArea.bottom;
        }

        basePath = [
          new Segment(x1, y1, startX, y1),
          new Segment(startX, y1, startX, bypassY),
          new Segment(startX, bypassY, endX, bypassY),
          new Segment(endX, bypassY, endX, y2),
          new Segment(endX, y2, x2, y2),
        ];
      }
    }

    // 应用连线避让 (基于画布坐标)
    return this.applyLineAvoidance(basePath, x1, y1); // Pass canvas startX, startY
  }

  checkCanPassBetween(
    startBlockArea, // canvas coordinates
    endBlockArea, // canvas coordinates
    startY, // canvas coordinate
    endY, // canvas coordinate
    minPassageHeight // canvas units
  ) {
    const startBlockTop = startBlockArea.top;
    const startBlockBottom = startBlockArea.bottom;
    const endBlockTop = endBlockArea.top;
    const endBlockBottom = endBlockArea.bottom;

    // 情况1：起始块在上方，结束块在下方，中间有间隙
    if (startBlockBottom < endBlockTop) {
      const gapHeight = endBlockTop - startBlockBottom;
      if (gapHeight >= minPassageHeight) {
        const passageY = startBlockBottom + gapHeight / 2;
        return { canPass: true, passageY: passageY };
      }
    }

    // 情况2：结束块在上方，起始块在下方，中间有间隙
    if (endBlockBottom < startBlockTop) {
      const gapHeight = startBlockTop - endBlockBottom;
      if (gapHeight >= minPassageHeight) {
        const passageY = endBlockBottom + gapHeight / 2;
        return { canPass: true, passageY: passageY };
      }
    }

    // 情况3：两个块Y轴有重叠或接触，检查连接线是否可以从上方或下方通过
    const lineMinY = Math.min(startY, endY);
    const lineMaxY = Math.max(startY, endY);
    const blocksMinY = Math.min(startBlockTop, endBlockTop);
    const blocksMaxY = Math.max(startBlockBottom, endBlockBottom);

    // 检查连接线是否完全在两个块的上方
    if (lineMaxY < blocksMinY) {
      const passageY = (lineMinY + lineMaxY) / 2;
      return { canPass: true, passageY: passageY };
    }

    // 检查连接线是否完全在两个块的下方
    if (lineMinY > blocksMaxY) {
      const passageY = (lineMinY + lineMaxY) / 2;
      return { canPass: true, passageY: passageY };
    }

    // 不能穿过，需要绕行
    return { canPass: false, passageY: null };
  }

  // 计算层级偏移量，确保每条线都有不同的偏移
  calculateLayeredOffset(currentLineIndex) {
    // 如果是最早创建的线（索引为0），不需要偏移
    if (currentLineIndex === 0) {
      return 0;
    }

    // 基础偏移量 (LINE_SPACING is in canvas units)
    const baseOffset = LINE_SPACING;

    // 根据层级计算偏移量，每一层都有不同的偏移
    const layerOffset = baseOffset * currentLineIndex;

    // 智能确定偏移方向
    let direction = this.calculateAvoidanceDirection(currentLineIndex);

    const finalOffset = layerOffset * direction;
    return finalOffset;
  }

  // 新增：智能计算避让方向 (简化版)
  calculateAvoidanceDirection(currentLineIndex) {
    // 简单交替方向
    const direction = currentLineIndex % 2 === 0 ? 1 : -1;
    return direction;
  }

  // 应用连线避让算法
  applyLineAvoidance(basePath, startX, startY) {
    // basePath segments are in canvas coordinates
    // startX, startY are canvas coordinates of the current line's start
    const existingLines = lineManager.getExistingLines(this);
    if (existingLines.length === 0) {
      return basePath;
    }

    let adjustedPath = [...basePath];

    // 对每个线段进行避让检查，但严格保持第一段和最后一段水平
    for (let i = 0; i < adjustedPath.length; i++) {
      const segment = adjustedPath[i];
      const isFirstSegment = i === 0;
      const isLastSegment = i === adjustedPath.length - 1;

      // 第一段和最后一段必须保持水平，跳过冲突检测
      if (isFirstSegment || isLastSegment) {
        continue;
      }

      // 检查与现有线的冲突
      const conflicts = this.findSegmentConflicts(
        segment, // canvas coordinate segment
        existingLines, // existing lines' segments are also canvas coordinates
        startX, // canvas startX of current line
        startY // canvas startY of current line
      );

      if (conflicts.length > 0) {
        // 获取所有相关的线（包括当前线和冲突线）
        const allRelevantLines = [this, ...conflicts.map((c) => c.line)];
        // 按创建顺序排序，确定优先级
        const sortedLines = allRelevantLines.sort(
          (a, b) => a.creationOrder - b.creationOrder
        );
        // 找到当前线在排序后的位置
        const currentLineIndex = sortedLines.findIndex(
          (line) => line.id === this.id
        );

        const adjustedSegment = this.resolveSegmentConflicts(
          segment,
          conflicts,
          isFirstSegment,
          isLastSegment,
          currentLineIndex
        );
        if (adjustedSegment) {
          adjustedPath[i] = adjustedSegment;

          // 更新相邻线段的连接点，但保持头尾点不变
          this.updateAdjacentSegments(
            adjustedPath,
            i,
            isFirstSegment,
            isLastSegment
          );
        }
      }
    }

    // 最终确保第一段和最后一段保持水平
    if (adjustedPath.length > 0) {
      // 确保第一段是水平的
      const firstSegment = adjustedPath[0];
      firstSegment.y2 = firstSegment.y1;

      // 确保最后一段是水平的
      const lastSegment = adjustedPath[adjustedPath.length - 1];
      lastSegment.y1 = lastSegment.y2;
    }

    return adjustedPath;
  }

  // 简单路径的避让算法，只处理y方向避让
  applySimpleLineAvoidance(
    basePath, // canvas coordinates
    originalStartX, // canvas coordinates
    originalStartY, // canvas coordinates
    originalEndX, // canvas coordinates
    originalEndY // canvas coordinates
  ) {
    const existingLines = lineManager.getExistingLines(this);
    if (existingLines.length === 0) {
      return basePath;
    }

    let adjustedPath = [...basePath];

    // 只对中间的垂直线段进行避让
    const middleSegmentIndex = 1; // 垂直线段在简单路径中总是第二个
    if (adjustedPath.length > middleSegmentIndex) {
      const middleSegment = adjustedPath[middleSegmentIndex];

      if (middleSegment.isVertical) {
        // 检查垂直线段与现有线的冲突 (canvas coordinates)
        const conflicts = this.findVerticalSegmentConflicts(
          middleSegment, // canvas coordinate segment
          existingLines // existing lines' segments are canvas coordinates
        );

        if (conflicts.length > 0) {
          // 获取所有相关的线（包括当前线和冲突线）
          const allRelevantLines = [this, ...conflicts.map((c) => c.line)];
          // 按创建顺序排序，确定优先级
          const sortedLines = allRelevantLines.sort(
            (a, b) => a.creationOrder - b.creationOrder
          );
          // 找到当前线在排序后的位置
          const currentLineIndex = sortedLines.findIndex(
            (line) => line.id === this.id
          );

          // 计算层级偏移量，支持左右双向避让 (LINE_SPACING is canvas units)
          const layeredOffset = this.calculateLayeredOffset(
            currentLineIndex // Pass only currentLineIndex
          );

          // 调整垂直线段的x坐标 (canvas coordinates)
          const newX = middleSegment.x1 + layeredOffset;
          middleSegment.x1 = newX;
          middleSegment.x2 = newX;

          // 更新第一段和第三段的连接点，但保持头尾点不变
          adjustedPath[0].x2 = newX;
          if (adjustedPath.length > 2) {
            adjustedPath[2].x1 = newX;
          }
        }
      }
    }

    // 确保头尾点坐标不变
    if (adjustedPath.length > 0) {
      adjustedPath[0].x1 = originalStartX;
      adjustedPath[0].y1 = originalStartY;
      adjustedPath[adjustedPath.length - 1].x2 = originalEndX;
      adjustedPath[adjustedPath.length - 1].y2 = originalEndY;
    }

    return adjustedPath;
  }

  // 查找垂直线段的冲突
  findVerticalSegmentConflicts(segment, existingLines) {
    // segment and existingLines.segments are in canvas coordinates
    const conflicts = [];
    // margin is in canvas units (LINE_SPACING is canvas units)
    // 0.1 is a small epsilon, effectively canvas units if LINE_SPACING is small
    const margin = LINE_SPACING + 0.1;

    for (const line of existingLines) {
      for (const existingSegment of line.segments) {
        // these are canvas segments
        if (existingSegment.isVertical) {
          const xDiff = Math.abs(segment.x1 - existingSegment.x1);

          if (xDiff < margin) {
            const y1Min = Math.min(segment.y1, segment.y2);
            const y1Max = Math.max(segment.y1, segment.y2);
            const y2Min = Math.min(existingSegment.y1, existingSegment.y2);
            const y2Max = Math.max(existingSegment.y1, existingSegment.y2);

            const overlapMargin = 5; // Assuming 5 is in canvas units
            const hasOverlap = !(
              y1Max < y2Min - overlapMargin || y2Max < y1Min - overlapMargin
            );

            if (hasOverlap) {
              conflicts.push({
                segment: existingSegment,
                line: line,
                distance: xDiff,
              });
            }
          }
        }
      }
    }
    return conflicts;
  }

  // 查找线段与现有线的冲突
  findSegmentConflicts(segment, existingLines, currentStartX, currentStartY) {
    // segment, currentStartX, currentStartY are in canvas coordinates
    // existingLines.segments are in canvas coordinates
    const conflicts = [];

    for (const line of existingLines) {
      // 检查是否起始位置相同（允许x轴重叠）- uses canvas coordinates
      const sameStartPosition = this.hasSameStartPosition(
        line,
        currentStartX, // canvas coord
        currentStartY // canvas coord
      );

      for (const existingSegment of line.segments) {
        // canvas segments
        const conflict = this.checkSegmentConflict(
          segment, // canvas segment
          existingSegment, // canvas segment
          sameStartPosition
        );
        if (conflict) {
          conflicts.push({
            segment: existingSegment,
            line: line,
            sameStart: sameStartPosition,
            ...conflict,
          });
        }
      }
    }

    return conflicts;
  }

  // 检查是否有相同起始位置
  hasSameStartPosition(otherLine, currentStartX, currentStartY) {
    // currentStartX, currentStartY are canvas coordinates
    // otherLine.startX, otherLine.startY are already canvas coordinates
    const threshold = 5; // Assuming 5 is in canvas units
    const otherCanvasStartX = otherLine.startX;
    const otherCanvasStartY = otherLine.startY;

    return (
      Math.abs(otherCanvasStartX - currentStartX) < threshold &&
      Math.abs(otherCanvasStartY - currentStartY) < threshold
    );
  }

  // 检查两个线段的冲突
  checkSegmentConflict(segment1, segment2, allowYOverlap = false) {
    // segment1, segment2 are in canvas coordinates
    // LINE_SPACING is in canvas units
    const margin = LINE_SPACING + 0.1;

    // 垂直线段之间的冲突检查
    if (segment1.isVertical && segment2.isVertical) {
      const xDiff = Math.abs(segment1.x1 - segment2.x1);
      if (xDiff < margin) {
        // 修改后，距离等于LINE_SPACING的情况也会被视为冲突
        // 检查y轴重叠
        const y1Min = Math.min(segment1.y1, segment1.y2);
        const y1Max = Math.max(segment1.y1, segment1.y2);
        const y2Min = Math.min(segment2.y1, segment2.y2);
        const y2Max = Math.max(segment2.y1, segment2.y2);

        // 增加容错边距
        const overlapMargin = 5; // Assuming 5 is in canvas units
        if (!(y1Max < y2Min - overlapMargin || y2Max < y1Min - overlapMargin)) {
          return { type: "vertical", distance: xDiff };
        }
      }
    }

    // 水平线段之间的冲突检查
    if (segment1.isHorizontal && segment2.isHorizontal) {
      const yDiff = Math.abs(segment1.y1 - segment2.y1);
      if (yDiff < margin) {
        // 修改后，距离等于LINE_SPACING的情况也会被视为冲突
        // 检查x轴重叠
        const x1Min = Math.min(segment1.x1, segment1.x2);
        const x1Max = Math.max(segment1.x1, segment1.x2);
        const x2Min = Math.min(segment2.x1, segment2.x2);
        const x2Max = Math.max(segment2.x1, segment2.x2);

        // 如果允许Y重叠且当前是水平线且Y值相等，则不视为冲突
        if (allowYOverlap && Math.abs(segment1.y1 - segment2.y1) < 1) {
          // 1 is a small canvas unit tolerance
          return null;
        }

        // 增加容错边距
        const overlapMargin = 5; // Assuming 5 is in canvas units
        if (!(x1Max < x2Min - overlapMargin || x2Max < x1Min - overlapMargin)) {
          return { type: "horizontal", distance: yDiff };
        }
      }
    }

    return null;
  }

  // 解决线段冲突
  resolveSegmentConflicts(
    segment, // canvas coordinates
    conflicts,
    isFirstSegment = false,
    isLastSegment = false,
    currentLineIndex
  ) {
    if (conflicts.length === 0) return null;

    // 第一段和最后一段必须保持水平，不允许倾斜
    if (isFirstSegment || isLastSegment) {
      return null;
    }

    // 根据冲突类型调整线段
    const firstConflict = conflicts[0];
    let adjustedSegment = new Segment(
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2
    );

    if (firstConflict.type === "horizontal") {
      // 水平线冲突，调整y坐标
      // layeredOffset is based on LINE_SPACING (canvas units)
      const layeredOffset = this.calculateLayeredOffset(
        currentLineIndex // Pass only currentLineIndex
      );

      // 对于中间的水平线段，整体移动 (canvas coordinates)
      adjustedSegment.y1 += layeredOffset;
      adjustedSegment.y2 += layeredOffset;
    } else if (firstConflict.type === "vertical") {
      // 垂直线冲突，调整x坐标
      // layeredOffset is based on LINE_SPACING (canvas units)
      const layeredOffset = this.calculateLayeredOffset(
        currentLineIndex // Pass only currentLineIndex
      );

      // 对于中间的垂直线段，整体移动 (canvas coordinates)
      adjustedSegment.x1 += layeredOffset;
      adjustedSegment.x2 += layeredOffset;
    }

    return adjustedSegment;
  }

  // 更新相邻线段的连接点
  updateAdjacentSegments(
    path, // segments in canvas coordinates
    changedIndex,
    isFirstSegment = false,
    isLastSegment = false
  ) {
    const changedSegment = path[changedIndex];

    // 第一段和最后一段不调整端点，保持连接器位置不变
    if (isFirstSegment || isLastSegment) {
      return;
    }

    // 更新前一个线段的终点
    if (changedIndex > 0) {
      const prevSegment = path[changedIndex - 1];
      // 如果前一个是第一段，只更新非连接器端
      if (changedIndex === 1) {
        // 第一段是水平线，只更新x2坐标
        prevSegment.x2 = changedSegment.x1;
        // y2保持不变，因为第一段必须是水平的
      } else {
        prevSegment.x2 = changedSegment.x1;
        prevSegment.y2 = changedSegment.y1;
      }
    }

    // 更新后一个线段的起点
    if (changedIndex < path.length - 1) {
      const nextSegment = path[changedIndex + 1];
      // 如果后一个是最后一段，只更新非连接器端
      if (changedIndex === path.length - 2) {
        // 最后一段是水平线，只更新x1坐标
        nextSegment.x1 = changedSegment.x2;
        // y1保持不变，因为最后一段必须是水平的
      } else {
        nextSegment.x1 = changedSegment.x2;
        nextSegment.y1 = changedSegment.y2;
      }
    }
  }

  getSVGPath() {
    if (this.segments.length === 0) {
      // Fallback for no segments, convert start/end to screen for SVG
      const screenStartX = this.startX * this.scale + this.offsetX;
      const screenStartY = this.startY * this.scale + this.offsetY;
      const screenEndX = this.endX * this.scale + this.offsetX;
      const screenEndY = this.endY * this.scale + this.offsetY;
      return `M ${screenStartX} ${screenStartY} L ${screenEndX} ${screenEndY}`;
    }

    // Convert first point to screen coordinates
    let screenX1 = this.segments[0].x1 * this.scale + this.offsetX;
    let screenY1 = this.segments[0].y1 * this.scale + this.offsetY;
    let path = `M ${screenX1} ${screenY1}`;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]; // Segment has canvas coordinates
      // Convert segment's end point to screen coordinates
      const screenX2 = segment.x2 * this.scale + this.offsetX;
      const screenY2 = segment.y2 * this.scale + this.offsetY;
      path += ` L ${screenX2} ${screenY2}`;
    }

    return path;
  }

  // 创建用于正在连接时的临时连接线
  static createConnectingLine(
    startX, // canvas coordinate
    startY, // canvas coordinate
    mouseX, // canvas coordinate (caller must convert from screen if necessary)
    mouseY, // canvas coordinate (caller must convert from screen if necessary)
    startBlock = null,
    scale = 1, // scale, offsetX, offsetY for the new Line's rendering context
    offsetX = 0,
    offsetY = 0
  ) {
    // startX, startY, mouseX, mouseY are already canvas coordinates.
    // The Line constructor expects canvas coordinates for its start/end.
    const line = new Line(
      startX,
      startY,
      mouseX, // Use canvas mouseX as endX for the line
      mouseY, // Use canvas mouseY as endY for the line
      startBlock,
      null, // endBlock is null for connecting line
      scale, // Pass scale for rendering context
      offsetX, // Pass offsetX for rendering context
      offsetY, // Pass offsetY for rendering context
      false // Do not add to manager yet
    );

    // 为正在连接的线计算特殊路径, using canvas coordinates
    line.calculateConnectingPath(
      startX, // canvas coord
      startY, // canvas coord
      mouseX, // canvas coord
      mouseY, // canvas coord
      startBlock // startBlock has canvas coords
      // No need to pass scale/offset to calculateConnectingPath if all inputs are canvas
    );

    return line;
  }

  calculateConnectingPath(x1, y1, x2, y2, startBlock) {
    // x1, y1, x2, y2 are canvas coordinates
    // startBlock has canvas coordinates
    if (!startBlock) {
      this.segments = this.createSimplePath(x1, y1, x2, y2); // Uses canvas coords
      return;
    }

    // 如果鼠标在起始块的左边，使用简单连接 (canvas coordinate comparison)
    if (x1 < x2) {
      // Corrected: should be x2 < x1 for "mouse to the left of start block output"
      // Assuming x1 is start (right side of block), x2 is mouse.
      // If mouse (x2) is to the right of start (x1), then x2 > x1.
      // If mouse (x2) is to the left of start (x1), then x2 < x1.
      // The original logic was: if (x1 < x2) - this means start is to the left of end (mouse)
      // This seems to be for cases where the line naturally goes right-to-left.
      // Let's keep the original condition meaning: if endX is to the right of startX
      const midX = x1 + (x2 - x1) * 0.5;
      this.segments = [
        new Segment(x1, y1, midX, y1),
        new Segment(midX, y1, midX, y2),
        new Segment(midX, y2, x2, y2),
      ];
      return;
    }

    // Constants are canvas units
    const connExtend = CONNECTOR_EXTENSION;
    const safeDist = BLOCK_AVOID_MARGIN;

    const startPathX = x1 + connExtend; // canvas coord
    const endPathX = x2 - connExtend; // canvas coord, careful if x2 is already to the left

    // 计算起始块的避让区域 (using canvas coordinates from startBlock)
    const blockCanvasX = startBlock.x;
    const blockCanvasY = startBlock.y;
    const blockCanvasWidth = startBlock.width;
    const blockCanvasHeight = startBlock.height;

    const blockAvoidArea = {
      left: blockCanvasX - safeDist,
      right: blockCanvasX + blockCanvasWidth + safeDist,
      top: blockCanvasY - safeDist,
      bottom: blockCanvasY + blockCanvasHeight + safeDist,
    };

    // 检查是否需要绕行 (canvas coordinate comparison)
    const needXBypass =
      startPathX > blockAvoidArea.left && endPathX < blockAvoidArea.right;

    if (!needXBypass) {
      // 不需要绕行
      this.segments = [
        new Segment(x1, y1, startPathX, y1),
        new Segment(startPathX, y1, startPathX, y2),
        new Segment(startPathX, y2, endPathX, y2), // endPathX might be to the right of x2
        new Segment(endPathX, y2, x2, y2),
      ];
      return;
    }

    // 需要考虑绕行，检查是否可以从块的上方或下方穿过
    const lineMinY = Math.min(y1, y2);
    const lineMaxY = Math.max(y1, y2);

    // 检查是否可以从上方穿过
    if (lineMaxY < blockAvoidArea.top) {
      const passageY = (y1 + y2) / 2;
      this.segments = [
        new Segment(x1, y1, startPathX, y1),
        new Segment(startPathX, y1, startPathX, passageY),
        new Segment(startPathX, passageY, endPathX, passageY),
        new Segment(endPathX, passageY, endPathX, y2),
        new Segment(endPathX, y2, x2, y2),
      ];
      return;
    }

    // 检查是否可以从下方穿过
    if (lineMinY > blockAvoidArea.bottom) {
      const passageY = (y1 + y2) / 2;
      this.segments = [
        new Segment(x1, y1, startPathX, y1),
        new Segment(startPathX, y1, startPathX, passageY),
        new Segment(startPathX, passageY, endPathX, passageY),
        new Segment(endPathX, passageY, endPathX, y2),
        new Segment(endPathX, y2, x2, y2),
      ];
      return;
    }

    // 需要绕行，选择上方或下方
    const centerY = (y1 + y2) / 2;
    const distanceToTop = Math.abs(centerY - blockAvoidArea.top);
    const distanceToBottom = Math.abs(centerY - blockAvoidArea.bottom);

    let bypassY;
    if (distanceToTop < distanceToBottom) {
      bypassY = blockAvoidArea.top;
    } else {
      bypassY = blockAvoidArea.bottom;
    }

    // 构建绕行路径
    this.segments = [
      new Segment(x1, y1, startPathX, y1),
      new Segment(startPathX, y1, startPathX, bypassY),
      new Segment(startPathX, bypassY, endPathX, bypassY),
      new Segment(endPathX, bypassY, endPathX, y2),
      new Segment(endPathX, y2, x2, y2),
    ];
  }

  isLineInSelectionBox(selectionBox) {
    // selectionBox is assumed to be in canvas coordinates
    // this.segments are in canvas coordinates
    if (!selectionBox || this.segments.length === 0) return false;

    // No need to convert selectionBox if it's already canvas coords
    // const screenSelectionBox = { ... } // This conversion is removed

    // 检查任何一个线段是否与选择框相交 (all in canvas coordinates)
    return this.segments.some((segment) => {
      const line = {
        // segment x1,y1,x2,y2 are canvas coords
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
      };
      return isLineIntersectBox(line, selectionBox); // Pass canvas coords
    });
  }
}

// 检查线段是否与矩形相交
// line and box are expected to be in the same coordinate system (now canvas)
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
// x, y and box are expected to be in the same coordinate system (now canvas)
function isPointInBox(x, y, box) {
  return (
    x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height
  );
}

// 检查两条线段是否相交
// line1 and line2 are expected to be in the same coordinate system (now canvas)
function doLinesIntersect(line1, line2) {
  const { x1: x1, y1: y1, x2: x2, y2: y2 } = line1;
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return false; // 平行线

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export {
  Segment,
  Line,
  LineManager,
  lineManager,
  CONNECTOR_EXTENSION,
  BLOCK_AVOID_MARGIN,
};
