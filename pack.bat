@echo off
setlocal enabledelayedexpansion

REM 解析命令行参数
set PACK_FRONTEND=1
set PACK_BACKEND=1

:parse_args
if "%~1"=="" goto :start_pack
if /i "%~1"=="--no-frontend" set PACK_FRONTEND=0
if /i "%~1"=="--no-backend" set PACK_BACKEND=0
if /i "%~1"=="--frontend-only" (
    set PACK_FRONTEND=1
    set PACK_BACKEND=0
)
if /i "%~1"=="--backend-only" (
    set PACK_FRONTEND=0
    set PACK_BACKEND=1
)
if /i "%~1"=="--help" goto :help
shift
goto :parse_args

:help
echo 使用方法: pack.bat [选项]
echo.
echo 选项:
echo   --no-frontend     跳过前端打包
echo   --no-backend      跳过后端打包
echo   --frontend-only   仅打包前端
echo   --backend-only    仅打包后端
echo   --help           显示此帮助信息
echo.
echo 默认行为: 打包前端和后端
goto :end

:start_pack
echo ====================================
echo 开始打包项目
echo ====================================

REM 获取当前目录
set PROJECT_ROOT=%cd%

REM 检查必要的目录是否存在
if not exist "in_frontend" (
    echo 错误: 找不到 in_frontend 目录
    exit /b 1
)

if not exist "in_backend" (
    echo 错误: 找不到 in_backend 目录
    exit /b 1
)

REM 创建dist目录
if exist "dist" (
    echo 删除现有的 dist 目录
    rmdir /s /q "dist"
    if !errorlevel! neq 0 (
        echo 错误: 删除 dist 目录失败
        exit /b 1
    )
)

echo 创建 dist 目录
mkdir dist
if !errorlevel! neq 0 (
    echo 错误: 创建 dist 目录失败
    exit /b 1
)

mkdir dist\resources
if !errorlevel! neq 0 (
    echo 错误: 创建 dist\resources 目录失败
    exit /b 1
)

REM 打包前端
if %PACK_FRONTEND%==1 (
    echo.
    echo ====================================
    echo 打包前端项目...
    echo ====================================
    
    cd "%PROJECT_ROOT%\in_frontend"
    
    echo 运行 npm run electron:build...
    call npm run electron:build
    
    if !errorlevel! neq 0 (
        echo 错误: 前端打包失败
        cd "%PROJECT_ROOT%"
        exit /b 1
    )
    
    echo 前端打包完成
    cd "%PROJECT_ROOT%"
) else (
    echo 跳过前端打包
)

REM 打包后端
if %PACK_BACKEND%==1 (
    echo.
    echo ====================================
    echo 打包后端项目...
    echo ====================================
    
    cd "%PROJECT_ROOT%\in_backend"
    
    echo 运行 pyinstaller -F main.py...
    pyinstaller -F main.py
    
    if !errorlevel! neq 0 (
        echo 错误: 后端打包失败
        cd "%PROJECT_ROOT%"
        exit /b 1
    )
    
    echo 后端打包完成
    cd "%PROJECT_ROOT%"
) else (
    echo 跳过后端打包
)

echo.
echo ====================================
echo 复制文件和重命名...
echo ====================================

REM 复制前端构建结果
if exist "in_frontend\dist_electron\win-unpacked" (
    echo 复制前端构建文件到 dist 目录...
    xcopy "in_frontend\dist_electron\win-unpacked\*" "dist\" /E /Y /I
    
    if !errorlevel! neq 0 (
        echo 警告: 复制前端文件时出现错误
    ) else (
        echo 前端文件复制完成
    )
) else (
    echo 警告: 找不到 in_frontend\dist_electron\win-unpacked 目录
)

REM 复制后端可执行文件
if exist "in_backend\dist\main.exe" (
    echo 复制后端可执行文件...
    copy "in_backend\dist\main.exe" "dist\resources\" /Y
    
    if !errorlevel! neq 0 (
        echo 错误: 复制后端可执行文件失败
        exit /b 1
    ) else (
        echo 后端可执行文件复制完成
    )
) else (
    echo 警告: 找不到 in_backend\dist\main.exe 文件
)

REM 复制配置文件
if exist "in_backend\config.yaml" (
    echo 复制配置文件...
    copy "in_backend\config.yaml" "dist\resources\" /Y
    
    if !errorlevel! neq 0 (
        echo 警告: 复制配置文件失败
    ) else (
        echo 配置文件复制完成
    )
) else (
    echo 警告: 找不到 in_backend\config.yaml 文件
)

REM 重命名可执行文件
if exist "dist\resources\main.exe" (
    echo 重命名 main.exe 为 service.exe...
    ren "dist\resources\main.exe" "service.exe"
    
    if !errorlevel! neq 0 (
        echo 错误: 重命名可执行文件失败
        exit /b 1
    ) else (
        echo 文件重命名完成
    )
) else (
    echo 警告: 找不到 dist\resources\main.exe 文件，跳过重命名
)

echo.
echo ====================================
echo 打包完成！
echo ====================================
echo.
echo 输出目录: %PROJECT_ROOT%\dist
echo.

:end
endlocal
