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
    console.log(error);
    if (error instanceof Error) {
      const errorMessage = error.message.includes("Error:")
        ? error.message.split("Error:").pop().trim()
        : error.message;
      return errorMessage;
    }
    if (error instanceof Object && error.message) {
      return `${error.name}: ${error.message}`;
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

  // 保存工作区到文件
  saveWorkspace: (workspace, name) => {
    return ipcRenderer.invoke("save-workspace", workspace, name);
  },

  // 从文件加载工作区
  loadWorkspace: (name) => {
    return ipcRenderer.invoke("load-workspace", name);
  },

  // 获取工作区列表
  getWorkspaceList: () => {
    return ipcRenderer.invoke("get-workspace-list");
  },

  // 选择转换代码存储路径
  selectCodeOutputPath: () => {
    return ipcRenderer.invoke("select-code-output-path");
  },

  // 打开文件夹
  openDirectory: (path) => {
    return ipcRenderer.invoke("open-directory", path);
  },

  // 上传保存的fbt到FBB
  uploadToFBB: (folderPath) => {
    return ipcRenderer.invoke("upload-to-fbb", folderPath);
  },
});
