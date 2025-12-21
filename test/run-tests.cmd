@echo off
echo.
echo Running all tests...
echo.

set FAILED=0

node test/test_javahon.js
if errorlevel 1 set FAILED=1

node test/test_events.js
if errorlevel 1 set FAILED=1

node test/test_debug.js
if errorlevel 1 set FAILED=1

if %FAILED%==0 (
    echo.
    echo ========================================
    echo All tests passed successfully!
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo Some tests failed!
    echo ========================================
    echo.
)

exit /b %FAILED%
