@echo off
call "%~dp0_node-env.cmd" || exit /b 1

pushd "%~dp0..\..\app" || exit /b 1
"%NODE_EXE%" "%NPM_CLI%" ci --ignore-scripts || exit /b 1

if exist "node_modules\esbuild\install.js" (
  "%NODE_EXE%" ".\node_modules\esbuild\install.js" || exit /b 1
)

popd

echo [vnetplay] app dependencies ready.
