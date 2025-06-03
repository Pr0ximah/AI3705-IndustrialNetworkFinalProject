@echo off
setlocal enabledelayedexpansion

REM ���������в���
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
echo ʹ�÷���: pack.bat [ѡ��]
echo.
echo ѡ��:
echo   --no-frontend     ����ǰ�˴��
echo   --no-backend      ������˴��
echo   --frontend-only   �����ǰ��
echo   --backend-only    ��������
echo   --help           ��ʾ�˰�����Ϣ
echo.
echo Ĭ����Ϊ: ���ǰ�˺ͺ��
goto :end

:start_pack
echo ====================================
echo ��ʼ�����Ŀ
echo ====================================

REM ��ȡ��ǰĿ¼
set PROJECT_ROOT=%cd%

REM ����Ҫ��Ŀ¼�Ƿ����
if not exist "in_frontend" (
    echo ����: �Ҳ��� in_frontend Ŀ¼
    exit /b 1
)

if not exist "in_backend" (
    echo ����: �Ҳ��� in_backend Ŀ¼
    exit /b 1
)

REM ����distĿ¼
if exist "dist" (
    echo ɾ�����е� dist Ŀ¼
    rmdir /s /q "dist"
    if !errorlevel! neq 0 (
        echo ����: ɾ�� dist Ŀ¼ʧ��
        exit /b 1
    )
)

echo ���� dist Ŀ¼
mkdir dist
if !errorlevel! neq 0 (
    echo ����: ���� dist Ŀ¼ʧ��
    exit /b 1
)

mkdir dist\resources
if !errorlevel! neq 0 (
    echo ����: ���� dist\resources Ŀ¼ʧ��
    exit /b 1
)

REM ���ǰ��
if %PACK_FRONTEND%==1 (
    echo.
    echo ====================================
    echo ���ǰ����Ŀ...
    echo ====================================
    
    cd "%PROJECT_ROOT%\in_frontend"
    
    echo ���� npm run electron:build...
    call npm run electron:build
    
    if !errorlevel! neq 0 (
        echo ����: ǰ�˴��ʧ��
        cd "%PROJECT_ROOT%"
        exit /b 1
    )
    
    echo ǰ�˴�����
    cd "%PROJECT_ROOT%"
) else (
    echo ����ǰ�˴��
)

REM ������
if %PACK_BACKEND%==1 (
    echo.
    echo ====================================
    echo ��������Ŀ...
    echo ====================================
    
    cd "%PROJECT_ROOT%\in_backend"
    
    echo ���� pyinstaller -F main.py...
    pyinstaller -F main.py
    
    if !errorlevel! neq 0 (
        echo ����: ��˴��ʧ��
        cd "%PROJECT_ROOT%"
        exit /b 1
    )
    
    echo ��˴�����
    cd "%PROJECT_ROOT%"
) else (
    echo ������˴��
)

echo.
echo ====================================
echo �����ļ���������...
echo ====================================

REM ����ǰ�˹������
if exist "in_frontend\dist_electron\win-unpacked" (
    echo ����ǰ�˹����ļ��� dist Ŀ¼...
    xcopy "in_frontend\dist_electron\win-unpacked\*" "dist\" /E /Y /I
    
    if !errorlevel! neq 0 (
        echo ����: ����ǰ���ļ�ʱ���ִ���
    ) else (
        echo ǰ���ļ��������
    )
) else (
    echo ����: �Ҳ��� in_frontend\dist_electron\win-unpacked Ŀ¼
)

REM ���ƺ�˿�ִ���ļ�
if exist "in_backend\dist\main.exe" (
    echo ���ƺ�˿�ִ���ļ�...
    copy "in_backend\dist\main.exe" "dist\resources\" /Y
    
    if !errorlevel! neq 0 (
        echo ����: ���ƺ�˿�ִ���ļ�ʧ��
        exit /b 1
    ) else (
        echo ��˿�ִ���ļ��������
    )
) else (
    echo ����: �Ҳ��� in_backend\dist\main.exe �ļ�
)

REM ���������ļ�
if exist "in_backend\config.yaml" (
    echo ���������ļ�...
    copy "in_backend\config.yaml" "dist\resources\" /Y
    
    if !errorlevel! neq 0 (
        echo ����: ���������ļ�ʧ��
    ) else (
        echo �����ļ��������
    )
) else (
    echo ����: �Ҳ��� in_backend\config.yaml �ļ�
)

REM ��������ִ���ļ�
if exist "dist\resources\main.exe" (
    echo ������ main.exe Ϊ service.exe...
    ren "dist\resources\main.exe" "service.exe"
    
    if !errorlevel! neq 0 (
        echo ����: ��������ִ���ļ�ʧ��
        exit /b 1
    ) else (
        echo �ļ����������
    )
) else (
    echo ����: �Ҳ��� dist\resources\main.exe �ļ�������������
)

echo.
echo ====================================
echo �����ɣ�
echo ====================================
echo.
echo ���Ŀ¼: %PROJECT_ROOT%\dist
echo.

:end
endlocal
