import json
import os
import xml.etree.ElementTree as ET
from xml.dom import minidom


def prettify(elem):
    rough = ET.tostring(elem, "utf-8")
    reparsed = minidom.parseString(rough)
    return reparsed.toprettyxml(indent="  ", encoding="UTF-8").decode("utf-8")


def convert_to_fbt(json_data):
    fb_name = json_data.get("name", "MyBasicFB")
    fb_comment = json_data.get("description", "A basic function block example")

    root = ET.Element(
        "FBType", Name=fb_name, Namespace="demo", version="1.0", Comment=fb_comment
    )
    ET.SubElement(
        root,
        "Identification",
        {
            "Standard": "IEC 61499",
            "Classification": "BasicFB",
            "ApplicationDomain": "General",
            "Function": "Logic",
            "Type": "FunctionBlock",
        },
    )

    # InterfaceList
    interface_list = ET.SubElement(root, "InterfaceList")
    event_inputs = ET.SubElement(interface_list, "EventInputs")
    for sig in json_data.get("signal_input", []):
        ET.SubElement(
            event_inputs, "Event", Name=sig["name"], Comment=sig["description"]
        )
    event_outputs = ET.SubElement(interface_list, "EventOutputs")
    for sig in json_data.get("signal_output", []):
        ET.SubElement(
            event_outputs, "Event", Name=sig["name"], Comment=sig["description"]
        )
    input_vars = ET.SubElement(interface_list, "InputVars")
    for var in json_data.get("var_input", []):
        ET.SubElement(
            input_vars,
            "VarDeclaration",
            Name=var["name"],
            Type=var["type"],
            Comment=var["description"],
        )
    output_vars = ET.SubElement(interface_list, "OutputVars")
    for var in json_data.get("var_output", []):
        ET.SubElement(
            output_vars,
            "VarDeclaration",
            Name=var["name"],
            Type=var["type"],
            Comment=var["description"],
        )

    # BasicFB
    basic_fb = ET.SubElement(root, "BasicFB")

    # InternalVars
    internal_vars = ET.SubElement(basic_fb, "InternalVars")
    for var in json_data.get("InternalVar", []):
        ET.SubElement(
            internal_vars,
            "VarDeclaration",
            Name=var["name"],
            Type=var["type"],
            Comment=var["description"],
            InitialValue=var.get("InitalVaule", "FALSE"),
        )

    # ECC
    ecc = ET.SubElement(basic_fb, "ECC")
    for state in json_data.get("ECC", {}).get("ECStates", []):
        state_elem = ET.SubElement(
            ecc,
            "ECState",
            Name=state["name"],
            Comment=state["comment"],
            x=str(state["x"]),
            y=str(state["y"]),
        )
        if "ecAction" in state:
            action = ET.SubElement(state_elem, "ECAction")
            if "Algorithm" in action:
                ET.SubElement(action, "Algorithm", Name=state["ecAction"]["Algorithm"])
            if "output" in action:
                ET.SubElement(action, "Output", Name=state["ecAction"]["output"])

    for trans in json_data.get("ECC", {}).get("ECTransitions", []):
        ET.SubElement(
            ecc,
            "ECTransition",
            Source=trans["source"],
            Destination=trans["destination"],
            Condition=trans["condition"],
            Comment=trans["comment"],
            x=str(trans["x"]),
            y=str(trans["y"]),
        )

    # Algorithms
    for alg in json_data.get("Algorithms", []):
        alg_elem = ET.SubElement(
            basic_fb, "Algorithm", Name=alg["Name"], Comment=alg["Comment"]
        )
        ET.SubElement(alg_elem, "ST").text = alg["Code"]

    return prettify(root)


# === 主处理函数 ===
def process_fbt(data, output_folder):
    data = json.loads(data)
    for i in data["blockCategories"]:
        xml_output = convert_to_fbt(i)
        fbt_filename = i["name"] + ".fbt"
        fbt_path = os.path.join(output_folder, fbt_filename)
        try:
            with open(fbt_path, "w", encoding="utf-8") as f:
                f.write(xml_output)
        except Exception as e:
            raise RuntimeError(f"Error writing FBT file {fbt_path}: {e}") from e
