param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$WorkingDirectory,
  [Parameter(Mandatory = $true)][string]$Executable,
  [string[]]$Arguments = @()
)

$ErrorActionPreference = "Continue"
$evidenceDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDirectory = "C:\Users\ayush\AppData\Local\YorWorldLocalHost\runtime\node-v24.19.0-win-x64"
$nodeExecutable = Join-Path $nodeDirectory "node.exe"
$pnpmExecutable = "C:\Users\ayush\AppData\Roaming\npm\pnpm.cmd"
$sourceCommit = "c13fde9e408d1ca053f43d7af6f9d9b0382100a8"
$sourceAppTree = "6b4619222c1f11e34c47a61c238447a30aa37eed"
$stdoutPath = Join-Path $evidenceDirectory "$Name.stdout.log"
$stderrPath = Join-Path $evidenceDirectory "$Name.stderr.log"
$metadataPath = Join-Path $evidenceDirectory "$Name.command.log"
$nodeVersion = (& $nodeExecutable -v).Trim()
$oldPath = $env:PATH
$env:PATH = "$nodeDirectory;$oldPath"
Push-Location -LiteralPath $WorkingDirectory
$pnpmVersion = (& $pnpmExecutable -v).Trim()
$commandText = "`"$Executable`" " + ($Arguments -join " ")
$metadata = @(
  "COMMAND: $commandText"
  "WORKING_DIRECTORY: $WorkingDirectory"
  "SOURCE_COMMIT: $sourceCommit"
  "SOURCE_APP_TREE: $sourceAppTree"
  "EVIDENCE_PARENT_COMMIT: 7177be622f33d64cbf7dc8f8a6fac5249aa056a1"
  "NODE_VERSION: $nodeVersion"
  "PNPM_VERSION: $pnpmVersion"
  "OS: Microsoft Windows 11 Home Single Language 10.0.26300 (64-bit)"
  "STARTED_UTC: $([DateTime]::UtcNow.ToString('o'))"
)
Set-Content -LiteralPath $metadataPath -Value $metadata -Encoding utf8

try {
  & $Executable @Arguments 1> $stdoutPath 2> $stderrPath
  $commandExitCode = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content -LiteralPath $stderrPath -Encoding utf8
  $commandExitCode = 1
} finally {
  Pop-Location
  $env:PATH = $oldPath
}

Add-Content -LiteralPath $metadataPath -Value @(
  "FINISHED_UTC: $([DateTime]::UtcNow.ToString('o'))"
  "EXIT_CODE: $commandExitCode"
) -Encoding utf8
exit $commandExitCode
