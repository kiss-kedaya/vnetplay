@echo off
setlocal

call "%~dp0app-install.cmd" || exit /b 1

echo [vnetplay] starting server in a new window...
start "vnetplay-server" cmd /k call "%~dp0server-dev.cmd"

echo [vnetplay] starting app dev server in current window...
call "%~dp0app-dev.cmd" %*
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%
