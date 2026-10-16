param(
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][string]$WorkingDirectory,
  [Parameter(Mandatory=$true)][string]$Executable,
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$PnpmEntry,
  [Parameter(Mandatory=$true)][string[]]$Arguments
)
$ErrorActionPreference = 'Stop'
$receiptDir = Split-Path -Parent $PSCommandPath
$stdoutPath = Join-Path $receiptDir ($Name + '.stdout.bin')
$stderrPath = Join-Path $receiptDir ($Name + '.stderr.bin')
$receiptPath = Join-Path $receiptDir ($Name + '.receipt.json')
$started = [DateTime]::UtcNow.ToString('o')
$argList = @($PnpmEntry) + $Arguments
$proc = Start-Process -FilePath $Executable -ArgumentList $argList -WorkingDirectory $WorkingDirectory -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
$ended = [DateTime]::UtcNow.ToString('o')
$nodeVersion = (& $NodePath --version | Out-String).Trim()
$pnpmVersion = (& $NodePath $PnpmEntry --version | Out-String).Trim()
function Get-Sha256([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
$receipt = [ordered]@{
  schemaVersion = 1
  name = $Name
  command = @($Executable, $PnpmEntry) + $Arguments
  workingDirectory = (Resolve-Path $WorkingDirectory).Path
  startedAtUtc = $started
  endedAtUtc = $ended
  exitCode = $proc.ExitCode
  nodeVersion = $nodeVersion
  pnpmVersion = $pnpmVersion
  stdout = [ordered]@{ path = [IO.Path]::GetFileName($stdoutPath); bytes = (Get-Item $stdoutPath).Length; sha256 = Get-Sha256 $stdoutPath }
  stderr = [ordered]@{ path = [IO.Path]::GetFileName($stderrPath); bytes = (Get-Item $stderrPath).Length; sha256 = Get-Sha256 $stderrPath }
}
[IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 8) + "`n", [Text.UTF8Encoding]::new($false))
Write-Output ($receipt | ConvertTo-Json -Depth 8)