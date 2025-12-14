@echo off
echo.
echo Running all tests...
echo.

set FAILED=0

node test/test_basic.js
if errorlevel 1 set FAILED=1

node test/test_events.js
if errorlevel 1 set FAILED=1

node test/test_javahon.js
if errorlevel 1 set FAILED=1

exit /b %FAILED%
