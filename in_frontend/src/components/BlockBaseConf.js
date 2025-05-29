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

class SignalConf {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
}

class CategoryConf {
  constructor(
    name,
    var_input,
    var_output,
    signal_input,
    signal_output,
    description,
    ECC
  ) {
    this.name = name;
    this.var_input = var_input;
    this.var_output = var_output;
    this.signal_input = signal_input;
    this.signal_output = signal_output;
    this.description = description;
    this.ECC = ECC;
  }
}

export { VarConf, CategoryConf, SignalConf };

let example_json = {
  name: "Example Category",
  var_input: [
    {
      name: "inputVar1",
      type: "int",
      description: "An integer input variable",
    },
    {
      name: "inputVar2",
      type: "float",
      description: "A float input variable",
    },
  ],
  var_output: [
    {
      name: "outputVar1",
      type: "float",
      description: "A float output variable",
    },
    {
      name: "outputVar2",
      type: "bool",
      description: "A boolean output variable",
    },
  ],
  signal_input: [
    {
      name: "inputSignal1",
      description: "An input signal",
    },
    {
      name: "inputSignal2",
      description: "Another input signal",
    },
  ],
  signal_output: [
    {
      name: "outputSignal1",
      description: "An output signal",
    },
    {
      name: "outputSignal2",
      description: "Another output signal",
    },
  ],
  ECC: "Example ECC",
  description: "This is an example category.",
};
