"use strict";

import { app, protocol, BrowserWindow, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import path from "path";
const fs = require("fs");
const { dialog } = require("electron");
const { spawn } = require("child_process");
const isDevelopment = process.env.NODE_ENV !== "production";
let mainWindow = null;
let blockEditorWindow = null;
let serviceProcess = null;

// 持久化数据目录
const userDataPath = app.getPath("userData");
const logsPath = path.join(userDataPath, "logs");
let projectPath = "";
let blockCategoriesFilePath = "";

// 日志文件路径
const logFiles = {
  mainStdout: path.join(logsPath, "main-stdout.log"),
  mainStderr: path.join(logsPath, "main-stderr.log"),
  serviceStdout: path.join(logsPath, "service-stdout.log"),
  serviceStderr: path.join(logsPath, "service-stderr.log"),
};

// 初始化日志系统
function initializeLogging() {
  // 开发环境下不启用日志
  if (isDevelopment) {
    console.log("开发环境：跳过日志系统初始化");
    return;
  }

  try {
    // 创建日志目录
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }

    // 清理旧日志或创建新日志文件
    Object.values(logFiles).forEach((logFile) => {
      if (fs.existsSync(logFile)) {
        // 保留最近的日志，可以选择截断或重命名
        const stats = fs.statSync(logFile);
        const fileSize = stats.size;

        // 如果文件大于10MB，创建备份并清空
        if (fileSize > 10 * 1024 * 1024) {
          const backupFile = logFile.replace(".log", `-${Date.now()}.log`);
          fs.renameSync(logFile, backupFile);
        }
      }
    });

    console.log(`日志系统初始化完成，日志目录: ${logsPath}`);
  } catch (error) {
    console.error(`初始化日志系统失败: ${error.message}`);
  }
}

// 写入日志函数
function writeLog(logFile, data, isError = false) {
  if (isDevelopment) return;

  try {
    const timestamp = new Date().toISOString();
    // 所有日志都用 UTF-8 文本格式
    const logEntry = `[${timestamp}] ${data.toString().trim()}\n`;
    fs.appendFileSync(logFile, logEntry, { encoding: "utf8" });
  } catch (error) {
    console.error(`写入日志失败 ${logFile}: ${error.message}`);
  }
}

// 重定向主进程的console输出
function setupMainProcessLogging() {
  // 开发环境下不重定向console输出
  if (isDevelopment) {
    console.log("开发环境：跳过主进程日志重定向");
    return;
  }

  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = (...args) => {
    const message = args.join(" ");
    writeLog(logFiles.mainStdout, message);
    originalConsoleLog(...args);
  };

  console.error = (...args) => {
    const message = args.join(" ");
    writeLog(logFiles.mainStderr, message, true);
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    const message = args.join(" ");
    writeLog(logFiles.mainStderr, `[WARN] ${message}`, true);
    originalConsoleWarn(...args);
  };
}

// 启动服务进程
function startServiceProcess() {
  // 开发环境下不启动服务进程
  if (isDevelopment) {
    console.log("开发环境：跳过服务进程启动");
    return;
  }

  const isWindows = process.platform === "win32";
  const executableName = isWindows ? "service.exe" : "service";

  // 确定可执行文件路径
  let executablePath;
  if (isDevelopment) {
    // 开发环境下的路径
    executablePath = path.join(
      app.getAppPath(),
      "../resources",
      executableName
    );
  } else {
    // 生产环境下的路径
    executablePath = path.join(process.resourcesPath, executableName);
  }

  try {
    // 检查文件是否存在
    if (!fs.existsSync(executablePath)) {
      console.error(`服务可执行文件不存在: ${executablePath}`);
      return;
    }

    // 确保 Python 子进程使用 UTF-8 输出
    const env = {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    };

    const spawnOptions = {
      detached: false,
      stdio: ["pipe", "pipe", "pipe"],
      env,
      windowsHide: isWindows,
    };
    serviceProcess = spawn(executablePath, [], spawnOptions);

    // 使用 UTF-8 解码 stdout/stderr
    serviceProcess.stdout.setEncoding("utf8");
    serviceProcess.stdout.on("data", (data) => {
      writeLog(logFiles.serviceStdout, data);
    });
    serviceProcess.stderr.setEncoding("utf8");
    serviceProcess.stderr.on("data", (data) => {
      writeLog(logFiles.serviceStderr, data, true);
    });

    // 处理子进程退出
    serviceProcess.on("close", (code, signal) => {
      const message = `服务进程退出，退出码: ${code}, 信号: ${signal}`;
      writeLog(logFiles.serviceStdout, message);
      serviceProcess = null;
    });

    serviceProcess.on("error", (error) => {
      const message = `服务进程启动失败: ${error.message}`;
      writeLog(logFiles.serviceStderr, message, true);
      serviceProcess = null;
    });

    // 确保子进程在父进程退出时也退出
    serviceProcess.on("disconnect", () => {
      const message = "服务进程已断开连接";
      writeLog(logFiles.serviceStdout, message);
    });

    const message = `服务进程已启动，PID: ${serviceProcess.pid}`;
    writeLog(logFiles.serviceStdout, message);
  } catch (error) {
    const message = `启动服务进程时发生错误: ${error.message}`;
    writeLog(logFiles.serviceStderr, message, true);
  }
}

// 关闭服务进程
function stopServiceProcess() {
  return new Promise((resolve) => {
    if (!serviceProcess) {
      resolve();
      return;
    }

    console.log("正在关闭服务进程...");

    const isWindows = process.platform === "win32";
    let processKilled = false;

    // 设置一个标志来跟踪进程是否已被杀死
    const markProcessKilled = () => {
      if (!processKilled) {
        processKilled = true;
        serviceProcess = null;
        resolve();
      }
    };

    if (isWindows) {
      try {
        // Windows下使用taskkill命令强制终止进程及其子进程
        const { exec } = require("child_process");
        exec(`taskkill /pid ${serviceProcess.pid} /T /F`, (error) => {
          if (error) {
            console.error(`taskkill命令执行失败: ${error.message}`);
            // 如果taskkill失败，尝试直接kill
            try {
              process.kill(serviceProcess.pid, "SIGKILL");
            } catch (killError) {
              console.error(`直接kill失败: ${killError.message}`);
            }
          }
          console.log("服务进程已强制终止");
          markProcessKilled();
        });

        // 设置超时保险
        setTimeout(() => {
          if (!processKilled) {
            console.log("超时强制终止进程");
            try {
              process.kill(serviceProcess.pid, "SIGKILL");
            } catch (error) {
              console.error(`超时强制终止失败: ${error.message}`);
            }
            markProcessKilled();
          }
        }, 2000);
      } catch (error) {
        console.error(`Windows终止进程失败: ${error.message}`);
        markProcessKilled();
      }
    } else {
      // Unix/Linux平台处理
      try {
        // 监听进程退出事件
        serviceProcess.on("exit", () => {
          if (!processKilled) {
            console.log("服务进程已优雅退出");
            markProcessKilled();
          }
        });

        // 先尝试优雅关闭
        serviceProcess.kill("SIGTERM");

        // 设置超时，如果进程在指定时间内没有退出，强制终止
        setTimeout(() => {
          if (!processKilled && serviceProcess) {
            console.log("强制终止服务进程");
            try {
              serviceProcess.kill("SIGKILL");
            } catch (error) {
              console.error(`强制终止失败: ${error.message}`);
            }
            markProcessKilled();
          }
        }, 3000);
      } catch (error) {
        console.error(`Unix终止进程失败: ${error.message}`);
        markProcessKilled();
      }
    }
  });
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

function windowFadeIn(window) {
  // 设置初始透明度为0
  window.setOpacity(0);
  window.show();

  // 定义淡入效果
  const fadeIn = () => {
    const currentOpacity = window.getOpacity();
    if (currentOpacity < 1) {
      window.setOpacity(Math.min(currentOpacity + 0.1, 1));
      setTimeout(fadeIn, 16); // 每16毫秒增加透明度，约60fps
    }
  };
  fadeIn();
}

function windowFadeOut(window, event) {
  try {
    // 检查窗口是否存在且未被销毁
    if (!window || window.isDestroyed()) {
      console.warn("窗口已被销毁，跳过淡出效果");
      return;
    }

    // 阻止默认关闭行为
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    // 定义淡出效果
    const fadeOut = () => {
      try {
        // 再次检查窗口状态
        if (!window || window.isDestroyed()) {
          return;
        }

        const currentOpacity = window.getOpacity();
        if (currentOpacity > 0) {
          window.setOpacity(Math.max(currentOpacity - 0.1, 0));
          setTimeout(fadeOut, 16); // 每16毫秒减少透明度，约60fps
        } else {
          window.hide(); // 完全透明后隐藏窗口
        }
      } catch (error) {
        console.error("淡出效果执行出错:", error);
        // 如果出错，直接销毁窗口
        if (window && !window.isDestroyed()) {
          window.destroy();
        }
      }
    };

    fadeOut();

    setTimeout(() => {
      try {
        if (window && !window.isDestroyed()) {
          window.destroy(); // 销毁窗口
        }
      } catch (error) {
        console.error("销毁窗口时出错:", error);
      }
    }, 500);
  } catch (error) {
    console.error("windowFadeOut函数执行出错:", error);
    // 出错时直接销毁窗口
    try {
      if (window && !window.isDestroyed()) {
        window.destroy();
      }
    } catch (destroyError) {
      console.error("强制销毁窗口时出错:", destroyError);
    }
  }
}

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1065,
    minHeight: 600,
    frame: false,
    show: false, // 初始不显示窗口
    icon: path.join(__dirname, "../assets/icon.png"), // 添加应用图标
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.join(__static, "preload.js"),
      devTools: isDevelopment, // 生产环境禁用开发者工具
    },
  });

  // 等待页面加载完成后再显示窗口
  mainWindow.once("ready-to-show", () => {
    // 淡入
    // windowFadeIn(mainWindow);
    mainWindow.show();
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    // if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    mainWindow.loadURL("app://./index.html");
  }

  // 添加窗口关闭事件处理
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", (event) => {
    // 淡出
    windowFadeOut(mainWindow, event);
  });
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  // 初始化日志系统
  initializeLogging();
  setupMainProcessLogging();

  console.log("应用程序启动");
  if (!isDevelopment) {
    console.log(`用户数据路径: ${userDataPath}`);
    console.log(`日志路径: ${logsPath}`);
  }

  createWindow();
  startServiceProcess(); // 启动服务进程
});

// 在应用退出前关闭服务进程
app.on("before-quit", async (event) => {
  if (serviceProcess) {
    event.preventDefault(); // 阻止应用立即退出
    console.log("应用准备退出，正在关闭服务进程...");

    try {
      await stopServiceProcess();
      console.log("服务进程已关闭，应用现在可以安全退出");
    } catch (error) {
      console.error(`关闭服务进程时发生错误: ${error.message}`);
    }

    // 确保子进程关闭后再退出应用
    setTimeout(() => {
      app.quit();
    }, 500);
  }
});

// 监听主进程的退出信号，确保清理子进程
process.on("SIGINT", () => {
  console.log("收到SIGINT信号，正在清理...");
  if (serviceProcess) {
    try {
      if (process.platform === "win32") {
        const { exec } = require("child_process");
        exec(`taskkill /pid ${serviceProcess.pid} /T /F`);
      } else {
        serviceProcess.kill("SIGKILL");
      }
    } catch (error) {
      console.error(`清理子进程失败: ${error.message}`);
    }
  }
  console.log("主进程退出");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("收到SIGTERM信号，正在清理...");
  if (serviceProcess) {
    try {
      if (process.platform === "win32") {
        const { exec } = require("child_process");
        exec(`taskkill /pid ${serviceProcess.pid} /T /F`);
      } else {
        serviceProcess.kill("SIGKILL");
      }
    } catch (error) {
      console.error(`清理子进程失败: ${error.message}`);
    }
  }
  console.log("主进程退出");
  process.exit(0);
});

// 保留原有的will-quit事件作为最后的保险
app.on("will-quit", () => {
  console.log("应用即将退出，执行最后的清理...");
  if (serviceProcess) {
    console.log("强制终止残留的服务进程");
    try {
      if (process.platform === "win32") {
        const { exec } = require("child_process");
        exec(`taskkill /pid ${serviceProcess.pid} /T /F`);
      } else {
        serviceProcess.kill("SIGKILL");
      }
    } catch (error) {
      console.error(`最后清理失败: ${error.message}`);
    }
    serviceProcess = null;
  }
});

ipcMain.on("close-window", (event, windowName) => {
  if (windowName === "main" && mainWindow) {
    mainWindow.close();
  }
  if (windowName === "block-editor" && blockEditorWindow) {
    blockEditorWindow.close();
    mainWindow.webContents.send("close-block-editor-signal");
  }
});

ipcMain.on("minimize-window", (event, windowName) => {
  if (windowName === "main" && mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("toggle-maximize-window", (event, windowName) => {
  if (windowName === "main" && mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("canvas:double-click-block", (event, categoryId) => {
  if (!blockEditorWindow) {
    const mainBounds = mainWindow.getBounds();
    const blockEditorWidth = 800;
    const blockEditorHeight = 500;
    let centerX = mainBounds.x + (mainBounds.width - blockEditorWidth) / 2;
    let centerY = mainBounds.y + (mainBounds.height - blockEditorHeight) / 2;

    centerX = Math.round(centerX);
    centerY = Math.round(centerY);

    if (isNaN(centerX) || centerX < 0) centerX = 200;
    if (isNaN(centerY) || centerY < 0) centerY = 100;

    // Create block editor window
    blockEditorWindow = new BrowserWindow({
      width: blockEditorWidth,
      height: blockEditorHeight,
      resizable: false,
      movable: false,
      show: false,
      frame: false,
      modal: true,
      parent: mainWindow, // Set the main window as the parent
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
        preload: path.join(__static, "preload.js"),
        additionalArguments: [`--category-id=${categoryId}`],
        devTools: isDevelopment, // 生产环境禁用开发者工具
      },
    });

    // 在窗口创建后设置位置
    blockEditorWindow.setPosition(centerX, centerY);

    blockEditorWindow.on("closed", () => {
      blockEditorWindow = null;
    });

    blockEditorWindow.once("ready-to-show", () => {
      blockEditorWindow.show();
    });

    blockEditorWindow.on("close", (event) => {
      // 确保窗口和事件对象都存在
      if (blockEditorWindow && event) {
        windowFadeOut(blockEditorWindow, event);
      } else {
        // 如果出现异常情况，直接销毁窗口
        if (blockEditorWindow) {
          try {
            blockEditorWindow.destroy();
          } catch (error) {
            console.error("销毁窗口时出错:", error);
          }
          blockEditorWindow = null;
        }
      }
    });
  }

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode with route
    blockEditorWindow.loadURL(
      `${process.env.WEBPACK_DEV_SERVER_URL}#/block-editor`
    );
  } else {
    // Load the app with route when not in development
    blockEditorWindow.loadURL(`app://./index.html#/block-editor`);
  }
});

ipcMain.handle("save-block-categories", async (event, categories) => {
  try {
    // Parse categories from JSON string to object list
    const categoriesList =
      typeof categories === "string" ? JSON.parse(categories) : categories;

    if (!Array.isArray(categoriesList)) {
      throw new Error("分类数据必须是数组格式");
    }

    fs.writeFileSync(
      blockCategoriesFilePath,
      JSON.stringify(categoriesList, null, 2)
    );
  } catch (error) {
    throw new Error(`保存功能块配置失败！错误： ${error.message}`);
  }
});

ipcMain.handle("load-block-categories", async (event) => {
  try {
    if (!fs.existsSync(blockCategoriesFilePath)) {
      throw new Error("功能块配置文件保存路径不存在！请重新生成。");
    }
    const categories = fs.readFileSync(blockCategoriesFilePath, "utf-8");
    return categories;
  } catch (error) {
    throw new Error(`加载功能块配置失败！错误： ${error.message}`);
  }
});

ipcMain.handle("load-block-category-by-id", async (event, id) => {
  try {
    if (!fs.existsSync(blockCategoriesFilePath)) {
      throw new Error("功能块配置文件保存路径不存在！请重新生成。");
    }

    let categories = fs.readFileSync(blockCategoriesFilePath, "utf-8");
    categories = JSON.parse(categories);

    if (!categories[id]) {
      throw new Error(`未找到ID为 ${id} 的功能块配置`);
    }

    return categories[id];
  } catch (error) {
    throw new Error(`加载功能块配置失败！错误： ${error.message}`);
  }
});

ipcMain.on("open-block-editor-signal", () => {
  if (mainWindow) {
    mainWindow.webContents.send("open-block-editor-signal");
  }
});

ipcMain.handle("save-modified-block-category", async (event, category) => {
  try {
    if (!fs.existsSync(blockCategoriesFilePath)) {
      throw new Error("功能块配置文件保存路径不存在！请重新生成。");
    }

    let categories = fs.readFileSync(blockCategoriesFilePath, "utf-8");
    categories = JSON.parse(categories);

    const parsedCategory =
      typeof category === "string" ? JSON.parse(category) : category;

    if (!parsedCategory.id && parsedCategory.id !== 0) {
      throw new Error("功能块配置必须包含有效的ID");
    }

    if (parsedCategory.id >= Object.keys(categories).length) {
      categories.push(parsedCategory);
    } else {
      categories[parsedCategory.id] = parsedCategory;
    }

    fs.writeFileSync(
      blockCategoriesFilePath,
      JSON.stringify(categories, null, 2)
    );
  } catch (error) {
    throw new Error(`保存修改的功能块配置失败！错误： ${error.message}`);
  }
});

ipcMain.handle("create-project", async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择项目保存路径",
      properties: ["openDirectory"],
      buttonLabel: "选择文件夹",
    });

    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  } catch (error) {
    throw new Error(`选择文件夹失败！错误： ${error.message}`);
  }
});

ipcMain.handle(
  "create-project-dir",
  async (event, _projectPath, projectName) => {
    let proj_path = path.join(_projectPath, projectName);
    projectPath = proj_path; // 更新全局项目路径
    if (fs.existsSync(proj_path)) {
      const result = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "文件夹已存在",
        message: `文件夹 "${projectName}" 已存在，是否要清空该文件夹？`,
        buttons: ["取消", "清空并继续"],
        defaultId: 0,
        cancelId: 0,
      });

      if (result.response === 0) {
        throw new Error("用户取消操作");
      }

      // 清空文件夹
      fs.rmSync(proj_path, { recursive: true, force: true });
    }
    let data_path = path.join(proj_path, "data");
    fs.mkdirSync(data_path, { recursive: true });
    blockCategoriesFilePath = path.join(data_path, "block-categories.json");
    return;
  }
);

ipcMain.handle("open-project-dir", async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择项目文件夹",
      properties: ["openDirectory"],
      buttonLabel: "选择文件夹",
    });

    if (result.canceled) {
      throw new Error("CANCEL");
    }

    const selectedPath = result.filePaths[0];
    projectPath = selectedPath; // 更新全局项目路径
    const blockCategoriesFile = path.join(
      selectedPath,
      "data",
      "block-categories.json"
    );

    if (!fs.existsSync(blockCategoriesFile)) {
      throw new Error("所选文件夹中未找到 data 文件夹，请选择有效的项目！");
    }

    blockCategoriesFilePath = blockCategoriesFile;
    return selectedPath;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("save-workspace", async (event, workspace, name) => {
  try {
    console.log("保存工作区数据", name);
    const basedir = path.join(projectPath, "sys", name);
    const filePath = path.join(basedir, "workspace.sys");
    if (!fs.existsSync(basedir)) {
      fs.mkdirSync(basedir, { recursive: true });
    }

    // 将workspace数据写入JSON文件
    const workspaceData =
      typeof workspace === "string"
        ? workspace
        : JSON.stringify(workspace, null, 2);

    fs.writeFileSync(filePath, workspaceData);

    return {
      path: basedir,
    };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("load-workspace", async (event, name) => {
  try {
    const filePath = path.join(projectPath, "sys", name, "workspace.sys");
    if (!fs.existsSync(filePath)) {
      throw new Error(`未找到工作区文件：${filePath}`);
    }
    const workspaceData = fs.readFileSync(filePath, "utf-8");
    return workspaceData;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("get-workspace-list", async (event) => {
  try {
    const workspaceDir = path.join(projectPath, "sys");

    if (!fs.existsSync(workspaceDir)) {
      return []; // 如果工作区目录不存在，返回空数组
    }
    const items = fs.readdirSync(workspaceDir);
    if (items.length === 0) {
      return []; // 如果没有工作区，返回空数组
    }
    const workspaces = items.filter((item) => {
      const itemPath = path.join(workspaceDir, item);
      return fs.lstatSync(itemPath).isDirectory();
    });

    return workspaces;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("select-code-output-path", async (event) => {
  try {
    // 打开对话框让用户选择代码输出目录
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择代码生成文件夹",
      properties: ["openDirectory"],
      buttonLabel: "选择文件夹",
      defaultPath: projectPath || app.getPath("documents"),
    });

    if (result.canceled) {
      throw new Error("CANCEL");
    }

    const selectedDir = result.filePaths[0];

    const targetDir = path.join(selectedDir, "code-output");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    return targetDir;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("open-directory", async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`目录不存在: ${dirPath}`);
    }

    const { shell } = require("electron");
    await shell.openPath(dirPath);
  } catch (error) {
    throw new Error(`打开目录失败: ${error.message}`);
  }
});
