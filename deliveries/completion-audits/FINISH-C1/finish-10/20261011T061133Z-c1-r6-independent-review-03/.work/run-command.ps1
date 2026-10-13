param(
  [Parameter(Mandatory=$true)][string]$CommandLine,
  [Parameter(Mandatory=$true)][string]$WorkingDirectory,
  [Parameter(Mandatory=$true)][string]$LogPath,
  [hashtable]$Environment=@{}
)
$ErrorActionPreference='Stop'
$start=New-Object System.Diagnostics.ProcessStartInfo
$start.FileName=Join-Path $env:SystemRoot 'System32/cmd.exe'
$start.Arguments="/d /c $CommandLine"
$start.WorkingDirectory=$WorkingDirectory
$start.UseShellExecute=$false
$start.CreateNoWindow=$true
$start.RedirectStandardOutput=$true
$start.StandardOutputEncoding=[System.Text.Encoding]::UTF8
$start.RedirectStandardError=$true
$start.StandardErrorEncoding=[System.Text.Encoding]::UTF8
foreach($key in $Environment.Keys){ $start.EnvironmentVariables[$key]=[string]$Environment[$key] }
$process=New-Object System.Diagnostics.Process
$process.StartInfo=$start
[void]$process.Start()
$startedAt=[DateTimeOffset]::Now
$stdoutTask=$process.StandardOutput.ReadToEndAsync()
$stderrTask=$process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdout=$stdoutTask.Result
$stderr=$stderrTask.Result
$utf8=New-Object System.Text.UTF8Encoding($false)
$content="COMMAND: $CommandLine`r`nWORKING_DIRECTORY: $WorkingDirectory`r`nSTARTED_AT_UTC=$($startedAt.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))`r`nSTARTED_AT_LOCAL=$($startedAt.ToString('o'))`r`nEXIT_CODE=$($process.ExitCode)`r`n--- STDOUT ---`r`n$stdout`r`n--- STDERR ---`r`n$stderr"
[System.IO.File]::WriteAllText($LogPath,$content,$utf8)
Write-Output "EXIT_CODE=$($process.ExitCode) LOG=$LogPath"
exit $process.ExitCode
