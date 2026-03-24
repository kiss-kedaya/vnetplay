@echo off
call "%~dp0_desktop-env.cmd" || exit /b 1

pushd "%~dp0..\..\desktop" || exit /b 1
"%NODE_EXE%" "%NPM_CLI%" ci || exit /b 1
popd

echo [vnetplay] desktop dependencies ready.
