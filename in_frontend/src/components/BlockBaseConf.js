import assert from "assert";

const VAR_TYPE = ["int", "float", "bool"];

class VarConf {
  constructor(name, type, description) {
    this.name = name;
    this.type = type;
    assert(VAR_TYPE.includes(type), `Invalid type: ${type}`);
    this.description = description;
  }
}

// @TODO: SignalConf properties and methods

class CategoryConf {
  constructor(
    name,
    var_input,
    var_output,
    signal_input,
    signal_output,
    description
  ) {
    this.name = name;
    this.var_input = var_input;
    this.var_output = var_output;
    this.signal_input = signal_input;
    this.signal_output = signal_output;
    this.description = description;
  }
}

export { VarConf, CategoryConf };
