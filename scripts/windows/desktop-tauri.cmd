@echo off
call "%~dp0_desktop-env.cmd" || exit /b 1

pushd "%~dp0..\..\desktop" || exit /b 1

if not exist "node_modules\@tauri-apps\cli\tauri.js" (
  "%NODE_EXE%" "%NPM_CLI%" ci || exit /b 1
)

"%NODE_EXE%" ".\node_modules\@tauri-apps\cli\tauri.js" %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
