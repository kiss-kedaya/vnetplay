@echo off
call "%~dp0app-install.cmd" || exit /b 1
call "%~dp0app-build.cmd" || exit /b 1
call "%~dp0desktop-install.cmd" || exit /b 1

pushd "%~dp0..\..\desktop\src-tauri" || exit /b 1
cargo fmt --check || exit /b 1
cargo clippy --all-targets -- -D warnings || exit /b 1
popd

echo [vnetplay] full local check ok.
