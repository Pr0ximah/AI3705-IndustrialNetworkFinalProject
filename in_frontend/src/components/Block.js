import equipment from "@/assets/equipment.svg";

// const BLOCK_COLOR_MAP = ["#f9b4ab", "#fdebd3", "#ccd9ff", "#f0fff0", "#e4d6ff"]; // 块颜色映射
const BLOCK_COLOR_MAP = [
  "#a3c4e8",
  "#ffbf87",
  "#95d095",
  "#c2a3de",
  "#c5a5a5",
  "#f1bbe1",
  "#bfbfbf",
  "#dde091",
  "#8bdde7",
];

function safeGet(list, index) {
  return index >= 0 && index < list.length ? list[index] : null;
}

class Block {
  // 静态属性
  static PLACE_STATE = {
    original: "original",
    placed: "placed",
  };

  static PARAMS = {
    width: 190,
    height: 190,
  };

  // 静态计数器用于生成唯一ID
  static _idCounter = 0;

  // 构造函数
  constructor(x, y, placeState, categoryConf, categoryIndex) {
    this.id = Block._generateUniqueId(); // 生成唯一ID
    this.x = x;
    this.y = y;
    this.width = Block.PARAMS.width;
    this.height = Block.PARAMS.height;
    this.categoryConf = categoryConf; // 类别配置
    this.categoryIndex = categoryIndex; // 直接传入索引而不是查找
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
  static createBlock(x, y, placeState, categoryConf, categoryIndex = 0) {
    return new Block(x, y, placeState, categoryConf, categoryIndex);
  }

  // 创建块的深拷贝
  clone() {
    const clonedBlock = new Block(
      this.x,
      this.y,
      this.place_state,
      this.categoryConf,
      this.categoryIndex
    );
    // 注意：clone会自动生成新的ID，这通常是我们想要的行为
    return clonedBlock;
  }
}

export default Block;
