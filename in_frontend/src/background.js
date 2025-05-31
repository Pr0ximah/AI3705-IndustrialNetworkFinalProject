"use strict";

import { app, protocol, BrowserWindow, Menu, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import path from "path";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
const fs = require("fs");
const isDevelopment = process.env.NODE_ENV !== "production";
let mainWindow = null;
let blockEditorWindow = null;

// 持久化数据目录
const userDataPath = app.getPath("userData");
const blockCategoriesFilePath = path.join(
  userDataPath,
  "block-categories.json"
);

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
  // 阻止默认关闭行为
  event.preventDefault();

  // 定义淡出效果
  const fadeOut = () => {
    const currentOpacity = window.getOpacity();
    if (currentOpacity > 0) {
      window.setOpacity(Math.max(currentOpacity - 0.1, 0));
      setTimeout(fadeOut, 16); // 每16毫秒减少透明度，约60fps
    } else {
      window.hide(); // 完全透明后隐藏窗口
    }
  };
  fadeOut();
  setTimeout(() => {
    window.destroy(); // 销毁窗口
  }, 500);
}

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    show: false, // 初始不显示窗口
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.join(__static, "preload.js"),
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
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

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
    const centerX = mainBounds.x + (mainBounds.width - blockEditorWidth) / 2;
    const centerY = mainBounds.y + (mainBounds.height - blockEditorHeight) / 2;

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
      windowFadeOut(blockEditorWindow, event);
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
  console.log(id);
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
  console.log("Received open-block-editor-signal");
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

    console.log(JSON.stringify(categories, null, 2));

    fs.writeFileSync(
      blockCategoriesFilePath,
      JSON.stringify(categories, null, 2)
    );
  } catch (error) {
    throw new Error(`保存修改的功能块配置失败！错误： ${error.message}`);
  }
});
