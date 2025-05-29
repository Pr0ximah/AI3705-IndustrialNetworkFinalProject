import assert from "assert";

const VAR_TYPE = ["int", "float", "bool", "Time"];

class VarConf {
  constructor(name, type, description) {
    this.name = name;
    this.type = type;
    assert(VAR_TYPE.includes(type), `Invalid type: ${type}`);
    this.description = description;
  }
}

class SignalConf {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
}

class ECAction {
  constructor(algorithm, output) {
    this.algorithm = algorithm;
    this.output = output;
  }
}

class ECState {
  constructor(name, comment = "", x = 0, y = 0, ecAction = null) {
    this.name = name;
    this.comment = comment;
    this.x = x;
    this.y = y;
    this.ecAction = ecAction; // ECAction 对象
  }
}

class ECTransition {
  constructor(source, destination, condition, comment = "", x = 0, y = 0) {
    this.source = source;
    this.destination = destination;
    this.condition = condition;
    this.comment = comment;
    this.x = x;
    this.y = y;
  }
}

class InternalVarConf {
  constructor(name, type, InitalVaule, description) {
    this.name = name;
    this.type = type;
    this.InitalVaule = InitalVaule;
    // 验证类型是否在允许的范围内
    assert(VAR_TYPE.includes(type), `Invalid type: ${type}`);
    this.description = description;
  }
}

class AlgorithmConf {
  constructor(name, description, inputVars, outputVars, code) {
    this.name = name;
    this.description = description;
    this.inputVars = inputVars; // 数组，包含 VarConf 对象
    this.outputVars = outputVars; // 数组，包含 VarConf 对象
    this.code = code; // 算法代码
    assert(typeof code === "string", "Code must be a string");
  }
}

class CategoryConf {
  constructor(
    name,
    var_input,
    var_output,
    signal_input,
    signal_output,
    internalVar,
    ECC,
    algorithms,
    description
  ) {
    this.name = name;
    this.var_input = var_input; // 数组，包含 VarConf 对象
    this.var_output = var_output; // 数组，包含 VarConf 对象
    this.signal_input = signal_input; // 数组，包含 SignalConf 对象
    this.signal_output = signal_output; // 数组，包含 SignalConf 对象
    this.internalVar = internalVar; // 数组，包含 InternalVarConf 对象
    this.ECC = ECC; // 数组，包含 ECState 和 ECTransitions 对象
    this.algorithms = algorithms; // 数组，包含 AlgorithmConf 对象
    this.description = description;
  }
}

export {
  VarConf,
  SignalConf,
  InternalVarConf,
  ECAction,
  ECState,
  ECTransition,
  AlgorithmConf,
  CategoryConf,
};
