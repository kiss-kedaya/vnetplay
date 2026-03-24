@echo off
call "%~dp0_node-env.cmd" || exit /b 1

pushd "%~dp0..\..\app" || exit /b 1

if not exist "node_modules\vite\bin\vite.js" (
  call "%~dp0app-install.cmd" || exit /b 1
)

"%NODE_EXE%" ".\node_modules\vite\bin\vite.js" %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
