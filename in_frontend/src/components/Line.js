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
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
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
    scale = 1,
    offsetX = 0,
    offsetY = 0
  ) {
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
    // 转换为屏幕坐标
    const x1 = this.startX * this.scale + this.offsetX;
    const y1 = this.startY * this.scale + this.offsetY;
    const x2 = this.endX * this.scale + this.offsetX;
    const y2 = this.endY * this.scale + this.offsetY;

    // 如果没有块信息或输出在输入左边，使用简单路径
    if (!this.startBlock || !this.endBlock || x1 < x2) {
      this.segments = this.createSimplePath(x1, y1, x2, y2);
      return;
    }

    // 使用避让算法计算路径
    this.segments = this.calculateAvoidancePath(x1, y1, x2, y2);
  }

  createSimplePath(x1, y1, x2, y2) {
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
    if (!this.startBlock || !this.endBlock) {
      return this.createSimplePath(x1, y1, x2, y2);
    }

    // 转换块坐标到屏幕坐标系
    const startBlockScreenX = this.startBlock.x * this.scale + this.offsetX;
    const startBlockScreenY = this.startBlock.y * this.scale + this.offsetY;
    const startBlockScreenWidth = this.startBlock.width * this.scale;
    const startBlockScreenHeight = this.startBlock.height * this.scale;

    const endBlockScreenX = this.endBlock.x * this.scale + this.offsetX;
    const endBlockScreenY = this.endBlock.y * this.scale + this.offsetY;
    const endBlockScreenWidth = this.endBlock.width * this.scale;
    const endBlockScreenHeight = this.endBlock.height * this.scale;

    // 计算延伸点
    const connExtend = CONNECTOR_EXTENSION;
    const safeDist = BLOCK_AVOID_MARGIN;
    const startX = x1 + connExtend;
    const endX = x2 - connExtend;

    // 计算两个块的避让区域（包含安全边距）
    const startBlockAvoidArea = {
      left: startBlockScreenX - safeDist,
      right: startBlockScreenX + startBlockScreenWidth + safeDist,
      top: startBlockScreenY - safeDist,
      bottom: startBlockScreenY + startBlockScreenHeight + safeDist,
    };

    const endBlockAvoidArea = {
      left: endBlockScreenX - safeDist,
      right: endBlockScreenX + endBlockScreenWidth + safeDist,
      top: endBlockScreenY - safeDist,
      bottom: endBlockScreenY + endBlockScreenHeight + safeDist,
    };

    // 检查X轴是否需要绕行
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
        y1,
        y2,
        40
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

    // 应用连线避让
    return this.applyLineAvoidance(basePath, x1, y1);
  }

  checkCanPassBetween(
    startBlockArea,
    endBlockArea,
    startY,
    endY,
    minPassageHeight
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

    // 基础偏移量
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
        segment,
        existingLines,
        startX,
        startY
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
    basePath,
    originalStartX,
    originalStartY,
    originalEndX,
    originalEndY
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
        // 检查垂直线段与现有线的冲突
        const conflicts = this.findVerticalSegmentConflicts(
          middleSegment,
          existingLines
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

          // 计算层级偏移量，支持左右双向避让
          const layeredOffset = this.calculateLayeredOffset(
            currentLineIndex // Pass only currentLineIndex
          );

          // 调整垂直线段的x坐标
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
    const conflicts = [];
    const margin = LINE_SPACING + 0.1; // 增加一个小的epsilon以包含精确间隔的线

    for (const line of existingLines) {
      for (const existingSegment of line.segments) {
        if (existingSegment.isVertical) {
          const xDiff = Math.abs(segment.x1 - existingSegment.x1);

          if (xDiff < margin) {
            const y1Min = Math.min(segment.y1, segment.y2);
            const y1Max = Math.max(segment.y1, segment.y2);
            const y2Min = Math.min(existingSegment.y1, existingSegment.y2);
            const y2Max = Math.max(existingSegment.y1, existingSegment.y2);

            const overlapMargin = 5;
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
    const conflicts = [];

    for (const line of existingLines) {
      // 检查是否起始位置相同（允许x轴重叠）
      const sameStartPosition = this.hasSameStartPosition(
        line,
        currentStartX,
        currentStartY
      );

      for (const existingSegment of line.segments) {
        const conflict = this.checkSegmentConflict(
          segment,
          existingSegment,
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
    const threshold = 5; // 允许的误差范围
    const otherStartX = otherLine.startX * otherLine.scale + otherLine.offsetX;
    const otherStartY = otherLine.startY * otherLine.scale + otherLine.offsetY;

    return (
      Math.abs(otherStartX - currentStartX) < threshold &&
      Math.abs(otherStartY - currentStartY) < threshold
    );
  }

  // 检查两个线段的冲突
  checkSegmentConflict(segment1, segment2, allowYOverlap = false) {
    // const margin = LINE_SPACING; // 使用更大的检测距离
    const margin = LINE_SPACING + 0.1; // 增加一个小的epsilon

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
        const overlapMargin = 5;
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
          return null;
        }

        // 增加容错边距
        const overlapMargin = 5;
        if (!(x1Max < x2Min - overlapMargin || x2Max < x1Min - overlapMargin)) {
          return { type: "horizontal", distance: yDiff };
        }
      }
    }

    return null;
  }

  // 解决线段冲突
  resolveSegmentConflicts(
    segment,
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
      const layeredOffset = this.calculateLayeredOffset(
        currentLineIndex // Pass only currentLineIndex
      );

      // 对于中间的水平线段，整体移动
      adjustedSegment.y1 += layeredOffset;
      adjustedSegment.y2 += layeredOffset;
    } else if (firstConflict.type === "vertical") {
      // 垂直线冲突，调整x坐标
      const layeredOffset = this.calculateLayeredOffset(
        currentLineIndex // Pass only currentLineIndex
      );

      // 对于中间的垂直线段，整体移动
      adjustedSegment.x1 += layeredOffset;
      adjustedSegment.x2 += layeredOffset;
    }

    return adjustedSegment;
  }

  // 更新相邻线段的连接点
  updateAdjacentSegments(
    path,
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
      return `M ${this.startX} ${this.startY} L ${this.endX} ${this.endY}`;
    }

    let path = `M ${this.segments[0].x1} ${this.segments[0].y1}`;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      path += ` L ${segment.x2} ${segment.y2}`;
    }

    return path;
  }

  // 创建用于正在连接时的临时连接线
  static createConnectingLine(
    startX,
    startY,
    mouseX,
    mouseY,
    startBlock = null,
    scale = 1,
    offsetX = 0,
    offsetY = 0
  ) {
    // 转换鼠标坐标到屏幕坐标
    const screenMouseX = mouseX * scale + offsetX;
    const screenMouseY = mouseY * scale + offsetY;

    const line = new Line(
      startX,
      startY,
      mouseX,
      mouseY,
      startBlock,
      null,
      scale,
      offsetX,
      offsetY,
      false
    );

    // 为正在连接的线计算特殊路径
    line.calculateConnectingPath(
      startX * scale + offsetX,
      startY * scale + offsetY,
      screenMouseX,
      screenMouseY,
      startBlock,
      scale,
      offsetX,
      offsetY
    );

    return line;
  }

  calculateConnectingPath(x1, y1, x2, y2, startBlock, scale, offsetX, offsetY) {
    if (!startBlock) {
      this.segments = this.createSimplePath(x1, y1, x2, y2);
      return;
    }

    // 如果鼠标在起始块的左边，使用简单连接
    if (x1 < x2) {
      const midX = x1 + (x2 - x1) * 0.5;
      this.segments = [
        new Segment(x1, y1, midX, y1),
        new Segment(midX, y1, midX, y2),
        new Segment(midX, y2, x2, y2),
      ];
      return;
    }

    // 鼠标在起始块的右边，考虑智能路径
    const connExtend = CONNECTOR_EXTENSION;
    const safeDist = BLOCK_AVOID_MARGIN;

    const startX = x1 + connExtend;
    const endX = x2 - connExtend;

    // 计算起始块的避让区域
    const startBlockScreenX = startBlock.x * scale + offsetX;
    const startBlockScreenY = startBlock.y * scale + offsetY;
    const startBlockScreenWidth = startBlock.width * scale;
    const startBlockScreenHeight = startBlock.height * scale;

    const blockAvoidArea = {
      left: startBlockScreenX - safeDist,
      right: startBlockScreenX + startBlockScreenWidth + safeDist,
      top: startBlockScreenY - safeDist,
      bottom: startBlockScreenY + startBlockScreenHeight + safeDist,
    };

    // 检查是否需要绕行
    const needXBypass =
      startX > blockAvoidArea.left && endX < blockAvoidArea.right;

    if (!needXBypass) {
      // 不需要绕行
      this.segments = [
        new Segment(x1, y1, startX, y1),
        new Segment(startX, y1, startX, y2),
        new Segment(startX, y2, endX, y2),
        new Segment(endX, y2, x2, y2),
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
        new Segment(x1, y1, startX, y1),
        new Segment(startX, y1, startX, passageY),
        new Segment(startX, passageY, endX, passageY),
        new Segment(endX, passageY, endX, y2),
        new Segment(endX, y2, x2, y2),
      ];
      return;
    }

    // 检查是否可以从下方穿过
    if (lineMinY > blockAvoidArea.bottom) {
      const passageY = (y1 + y2) / 2;
      this.segments = [
        new Segment(x1, y1, startX, y1),
        new Segment(startX, y1, startX, passageY),
        new Segment(startX, passageY, endX, passageY),
        new Segment(endX, passageY, endX, y2),
        new Segment(endX, y2, x2, y2),
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
      new Segment(x1, y1, startX, y1),
      new Segment(startX, y1, startX, bypassY),
      new Segment(startX, bypassY, endX, bypassY),
      new Segment(endX, bypassY, endX, y2),
      new Segment(endX, y2, x2, y2),
    ];
  }

  isLineInSelectionBox(selectionBox) {
    if (!selectionBox || this.segments.length === 0) return false;

    // 如果选择框是画布坐标，需要转换为屏幕坐标
    const screenSelectionBox = {
      x: selectionBox.x * this.scale + this.offsetX,
      y: selectionBox.y * this.scale + this.offsetY,
      width: selectionBox.width * this.scale,
      height: selectionBox.height * this.scale,
    };

    // 检查任何一个线段是否与选择框相交
    return this.segments.some((segment) => {
      const line = {
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
      };
      return isLineIntersectBox(line, screenSelectionBox);
    });
  }
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

export {
  Segment,
  Line,
  LineManager,
  lineManager,
  CONNECTOR_EXTENSION,
  BLOCK_AVOID_MARGIN,
};
