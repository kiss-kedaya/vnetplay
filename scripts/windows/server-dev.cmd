@echo off

pushd "%~dp0..\..\server" || exit /b 1
cargo run %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
