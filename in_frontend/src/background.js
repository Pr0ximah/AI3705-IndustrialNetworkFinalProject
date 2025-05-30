"use strict";

import { app, protocol, BrowserWindow, Menu, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import path from "path";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
const isDevelopment = process.env.NODE_ENV !== "production";
let mainWindow = null;
let blockEditorWindow = null;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.join(__static, "preload.js"),
    },
  });

  // 添加窗口显示
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 添加窗口关闭事件处理
  mainWindow.on("closed", () => {
    mainWindow = null;
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

ipcMain.on("block-editor:double-click-block", (event, blockId) => {
  if (!blockEditorWindow) {
    // Create block editor window
    blockEditorWindow = new BrowserWindow({
      width: 800,
      height: 500,
      resizable: false,
      show: false,
      frame: false,
      modal: true,
      parent: mainWindow, // Set the main window as the parent
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
        preload: path.join(__static, "preload.js"),
        additionalArguments: [`--block-id=${blockId}`],
      },
    });

    blockEditorWindow.on("closed", () => {
      blockEditorWindow = null;
    });

    blockEditorWindow.once("ready-to-show", () => {
      blockEditorWindow.show();
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
