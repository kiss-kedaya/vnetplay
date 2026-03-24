@echo off
call "%~dp0_node-env.cmd" || exit /b 1

set "PATH=%PATH:C:\Program Files\Git\usr\bin;=%"
set "PATH=%PATH:C:\Program Files\Git\mingw64\bin;=%"

exit /b 0
