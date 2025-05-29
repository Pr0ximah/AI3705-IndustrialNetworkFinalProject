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
});
