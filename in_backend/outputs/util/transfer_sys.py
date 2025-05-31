import json
from pathlib import Path


def process_sys(data, output_path):
    data = json.loads(data)
    id_total = []
    for i in data["connections"]:
        if i["start"]["blockId"] not in id_total:
            id_total.append(i["start"]["blockId"])
        if i["end"]["blockId"] not in id_total:
            id_total.append(i["end"]["blockId"])

    id_name = {}
    id_signal_input = {}
    id_signal_output = {}
    id_var_input = {}
    id_var_output = {}
    for i in data["blocks"]:
        if i["id"] not in id_name:
            id_name[i["id"]] = i["categoryConf"]["name"]
        if i["id"] not in id_signal_input:
            id_signal_input[i["id"]] = i["categoryConf"]["signal_input"]
        if i["id"] not in id_signal_output:
            id_signal_output[i["id"]] = i["categoryConf"]["signal_output"]
        if i["id"] not in id_var_input:
            id_var_input[i["id"]] = i["categoryConf"]["var_input"]
        if i["id"] not in id_var_output:
            id_var_output[i["id"]] = i["categoryConf"]["var_output"]

    my_id_name = {}
    name_count = {}
    for i in id_name:
        if id_name[i] not in name_count:
            name_count[id_name[i]] = 1
    for i in id_total:
        my_id_name[i] = id_name[i] + str(name_count[id_name[i]])
        name_count[id_name[i]] += 1

    # 写入
    output_path = Path(output_path) / "mysys.sys"
    with open(output_path, "w", encoding="utf-8") as f:
        f.truncate(0)
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write(
            '<System ID="693fd363-ca58-481d-bfb5-881390ec4fc0" Name="demo" Namespace="demo" Version="" IDEVersion="v1.2.1" Comment="System including ThreeEventRouter">\n'
        )
        f.write('  <Identification Standard="61499-2"/>\n')
        f.write("\n")
        # <Mapping From="app.conveyor1" To="Device1.RES3"/>
        for i in id_total:
            f.write(f' <Mapping From="app.{my_id_name[i]}" To="Device1.RES3"/>\n')
        f.write("\n")

        f.write(
            ' <Application Name="app" Comment="" Key="889a77a0-1c16-4b25-9bf5-da977b4a4a68">\n'
        )
        f.write("    <SubAppNetwork>\n")

        for i in range(len(id_total)):
            # <FB Key="-1" Name="conveyor1" Namespace="demo" Type="straightConveyor" x="50"  y="0"   />
            f.write(
                f'      <FB Key="{-i-1}" Name="{my_id_name[id_total[i]]}" Namespace="demo" Type="{id_name[id_total[i]]}" x="{150*i}" y="0" />\n'
            )

        f.write("      <EventConnections>\n")

        for i in data["connections"]:
            # <Connection Source="conveyor1.Running" Destination="三线.Start1" Priority="1"/>
            if i["start"]["type"] == "signal_output":
                a = my_id_name[i["start"]["blockId"]]
                b = id_signal_output[i["start"]["blockId"]][i["start"]["index"]]["name"]
                c = my_id_name[i["end"]["blockId"]]
                d = id_signal_input[i["end"]["blockId"]][i["end"]["index"]]["name"]
                f.write(
                    f'        <Connection Source="{a}.{b}" Destination="{c}.{d}" Priority="1"/>\n'
                )
        f.write("      </EventConnections>\n")
        f.write("      <DataConnections>\n")
        for i in data["connections"]:
            if i["start"]["type"] == "var_output":
                a = my_id_name[i["start"]["blockId"]]
                b = id_var_output[i["start"]["blockId"]][i["start"]["index"]]["name"]
                c = my_id_name[i["end"]["blockId"]]
                d = id_var_input[i["end"]["blockId"]][i["end"]["index"]]["name"]
                f.write(
                    f'        <Connection Source="{a}.{b}" Destination="{c}.{d}" Priority="1"/>\n'
                )
        f.write("      </DataConnections>\n")

        f.write("      <AdapterConnections/>\n")
        f.write("    </SubAppNetwork>\n")
        f.write("  </Application>\n")
        f.write(
            '  <Device Key="7f297351-45e1-4fec-91c1-a76c4054bb9e" Name="Device1" Type="FBSRT_X64_LINUX" Src="devices/ipc_linux.png" Location="12 38.5" CPUCores="1" Group="StartDeviceGroup">\n'
        )
        f.write('    <Parameter Name="Address"  Value="127.0.0.1"/>\n')
        f.write('    <Parameter Name="MGTPort"  Value="8081"/>\n')
        f.write(
            '    <Resource Key="3460ec59-57ad-4690-a2d5-d15b4ec4fc4d" Name="RES3" Type="EMB_RES" Port="1">\n'
        )
        for i in range(len(id_total)):
            # <FB Key="-1" Name="conveyor1" Namespace="demo" Type="straightConveyor" x="50"  y="0"   />
            f.write(
                f'      <FB Key="{-i-1}" Name="app.{my_id_name[id_total[i]]}" Namespace="demo" Type="{id_name[id_total[i]]}" x="{50*i}" y="0" />\n'
            )

        for i in data["connections"]:
            # <Connection Source="conveyor1.Running" Destination="三线.Start1" Priority="1"/>
            if i["start"]["type"] == "signal_output":
                a = my_id_name[i["start"]["blockId"]]
                b = id_signal_output[i["start"]["blockId"]][i["start"]["index"]]["name"]
                c = my_id_name[i["end"]["blockId"]]
                d = id_signal_input[i["end"]["blockId"]][i["end"]["index"]]["name"]
                f.write(
                    f'      <Connection Source="app.{a}.{b}" Destination="app.{c}.{d}" Priority="1"/>\n'
                )
            elif i["start"]["type"] == "var_output":
                a = my_id_name[i["start"]["blockId"]]
                b = id_var_output[i["start"]["blockId"]][i["start"]["index"]]["name"]
                c = my_id_name[i["end"]["blockId"]]
                d = id_var_input[i["end"]["blockId"]][i["end"]["index"]]["name"]
                f.write(
                    f'      <Connection Source="app.{a}.{b}" Destination="app.{c}.{d}" Priority="1"/>\n'
                )

        f.write("      <DataTable/>\n")
        f.write("    </Resource>\n")
        f.write("  </Device>\n")

        f.write("  <DataTable/>\n")
        f.write(
            '  <DeployGroup Key="StartDeviceGroup" IsGroup="true" Category="deviceGroup" Size="2100 700"/>\n'
        )
        f.write("</System>\n")
