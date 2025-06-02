const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 17990,
  },
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        // options placed here will be merged with default configuration in electron-builder
        appId: "com.ai3705.tiangongzhilian", // 应用 ID
        productName: "天工智联", // 生成的 exe 文件名
        copyright: "Copyright © 2025 TianGong ZhiLian", // 版权信息
        directories: {
          output: "./dist_electron", // 输出目录
        },
        win: {
          target: [
            {
              target: "portable", // 设置为 portable 来创建多个文件的便携版本
              arch: ["x64"],
            },
          ],
          icon: "public/logo.ico", // Windows 图标 (.ico 格式)
        },
        mac: {
          target: "dmg", // 或者 'zip', 'pkg' 等
        },
        linux: {
          target: "AppImage", // 或者 'deb', 'rpm' 等
        },
      },
    },
  },
});
