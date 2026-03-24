@echo off
call "%~dp0_node-env.cmd" || exit /b 1

pushd "%~dp0..\..\app" || exit /b 1

if not exist "node_modules\typescript\bin\tsc" (
  call "%~dp0app-install.cmd" || exit /b 1
)

"%NODE_EXE%" ".\node_modules\typescript\bin\tsc" --noEmit || exit /b 1
"%NODE_EXE%" ".\node_modules\vite\bin\vite.js" build || exit /b 1

popd

echo [vnetplay] app build ok.
