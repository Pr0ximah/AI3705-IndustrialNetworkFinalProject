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
  getProcessArgv: (name) => {
    const args = process.argv;
    if (name) {
      const arg = args.find((arg) => arg.startsWith(`--${name}=`));
      return arg ? arg.split("=")[1] : null;
    }
    return args.reduce((acc, arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.split("=");
        acc[key.slice(2)] = value || true; // 如果没有值，则设置为true
      }
      return acc;
    }, {});
  },

  // 保存块类型到本地
  saveBlockCategories: (categories) => {
    return ipcRenderer.invoke("save-block-categories", categories);
  },

  // 从本地加载块类型
  loadBlockCategories: () => {
    return ipcRenderer.invoke("load-block-categories");
  },

  // 从本地加载ID的块类型
  loadBlockCategoryById: (id) => {
    return ipcRenderer.invoke("load-block-category-by-id", id);
  },

  // 提取错误消息
  extractErrorMessage: (error) => {
    if (error instanceof Error) {
      const errorMessage = error.message.includes("Error:")
        ? error.message.split("Error:").pop().trim()
        : error.message;
      return errorMessage;
    }
    return String(error);
  },

  // 保存修改的块配置
  saveModifiedBlockCategory: (category) => {
    return ipcRenderer.invoke("save-modified-block-category", category);
  },

  // 欢迎界面创建工程
  createProject: () => {
    return ipcRenderer.invoke("create-project");
  },

  // 创建工程目录
  createProjectDir: (projectPath, projectName) => {
    return ipcRenderer.invoke("create-project-dir", projectPath, projectName);
  },

  // 打开工程目录
  openProjectDir: () => {
    return ipcRenderer.invoke("open-project-dir");
  },
});
