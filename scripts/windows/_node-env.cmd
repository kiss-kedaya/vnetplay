@echo off

set "NODE_EXE="
set "NODE_DIR="
set "NPM_CLI="

if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"

if not defined NODE_EXE (
  for /f "delims=" %%I in ('where node.exe 2^>nul') do (
    if not defined NODE_EXE set "NODE_EXE=%%I"
  )
)

if not defined NODE_EXE (
  echo [vnetplay] node.exe not found. Check your Node or nvm installation.
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"
set "NPM_CLI=%NODE_DIR%node_modules\npm\bin\npm-cli.js"

if not exist "%NPM_CLI%" (
  echo [vnetplay] npm-cli.js not found near %NODE_EXE%
  exit /b 1
)

exit /b 0
