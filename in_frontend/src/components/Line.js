const LINE_SPACING = 10; // 连接线间距
const MIN_SEGMENT_LENGTH = 20; // 最小线段长度
const CONNECTOR_EXTENSION = 30; // 连接器延伸长度
const BLOCK_AVOID_MARGIN = 15; // 块避让边距

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
    offsetY = 0
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
    this.calculatePath();
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
    return [
      new Segment(x1, y1, midX, y1),
      new Segment(midX, y1, midX, y2),
      new Segment(midX, y2, x2, y2),
    ];
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

    if (!needXBypass) {
      // X轴不需要绕行，直接连接
      return [
        new Segment(x1, y1, startX, y1),
        new Segment(startX, y1, startX, y2),
        new Segment(startX, y2, endX, y2),
        new Segment(endX, y2, x2, y2),
      ];
    }

    // X轴需要绕行，检查是否可以从两个块之间穿过
    const startY = y1;
    const endY = y2;
    const minPassageHeight = 40; // 最小通道高度

    const canPassBetween = this.checkCanPassBetween(
      startBlockAvoidArea,
      endBlockAvoidArea,
      startY,
      endY,
      minPassageHeight
    );

    if (canPassBetween.canPass) {
      // 可以从中间穿过
      const passageY = canPassBetween.passageY;
      return [
        new Segment(x1, y1, startX, y1),
        new Segment(startX, y1, startX, passageY),
        new Segment(startX, passageY, endX, passageY),
        new Segment(endX, passageY, endX, y2),
        new Segment(endX, y2, x2, y2),
      ];
    }

    // 不能从中间穿过，需要上下绕行
    const combinedAvoidArea = {
      left: Math.min(startBlockAvoidArea.left, endBlockAvoidArea.left),
      right: Math.max(startBlockAvoidArea.right, endBlockAvoidArea.right),
      top: Math.min(startBlockAvoidArea.top, endBlockAvoidArea.top),
      bottom: Math.max(startBlockAvoidArea.bottom, endBlockAvoidArea.bottom),
    };

    // 决定绕行方向：上方还是下方
    const centerY = (startY + endY) / 2;
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

    // 构建绕行路径
    return [
      new Segment(x1, y1, startX, y1),
      new Segment(startX, y1, startX, bypassY),
      new Segment(startX, bypassY, endX, bypassY),
      new Segment(endX, bypassY, endX, y2),
      new Segment(endX, y2, x2, y2),
    ];
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
      offsetY
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

    const box = selectionBox;

    // 检查任何一个线段是否与选择框相交
    return this.segments.some((segment) => {
      const line = {
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
      };
      return isLineIntersectBox(line, box);
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

export { Segment, Line, CONNECTOR_EXTENSION, BLOCK_AVOID_MARGIN };
