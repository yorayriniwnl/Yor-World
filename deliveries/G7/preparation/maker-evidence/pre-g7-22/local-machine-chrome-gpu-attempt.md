# Local Chrome GPU diagnostic attempt

The installed Chrome executable was found at C:\Program Files\Google\Chrome\Application\chrome.exe. An isolated temporary Chrome profile was launched for chrome://gpu with headless mode and a dynamic remote-debugging port. Chrome exited with code 0 before creating DevToolsActivePort, so the page text could not be retrieved. A second --dump-dom chrome://gpu attempt returned no page output. The GUI chrome://gpu lines are therefore NOT RUN.

The independent Playwright E2E did create WebGL 2.0 (OpenGL ES 3.0 Chromium) contexts with contextLost=false and reported ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, Direct3D11). Those values are preserved in visual-run/measurements/browser-environment-*.json and are not represented as the GUI chrome://gpu output.
