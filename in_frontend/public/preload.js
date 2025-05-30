// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipcApi", {
  send: (channel, data) => {
    // 注意：确保 channel 是允许的，避免安全风险
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  // 获取启动参数
  getProcessArgv: () => {
    return process.argv;
  },

  // 获取特定的block-id参数
  getBlockId: () => {
    const args = process.argv;
    const blockIdArg = args.find((arg) => arg.startsWith("--block-id="));
    return blockIdArg ? blockIdArg.split("=")[1] : null;
  },
});
