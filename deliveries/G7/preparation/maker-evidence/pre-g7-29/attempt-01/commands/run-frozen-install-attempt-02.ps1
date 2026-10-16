param(
  [Parameter(Mandatory = $true)][ValidateSet('accepted-root-500', 'p25-donor-28fb')][string]$SourceName,
  [Parameter(Mandatory = $true)][string]$SourceRoot,
  [Parameter(Mandatory = $true)][string]$AttemptRoot
)

$ErrorActionPreference = 'Stop'
$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpmCli = 'C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$nodeDir = Split-Path -Parent $nodeExe
$env:PATH = "$nodeDir;$env:PATH"
$sourceApp = Join-Path $SourceRoot 'app'
Set-Location -LiteralPath $sourceApp
$commandsDir = Join-Path $AttemptRoot 'commands'
$preflightDir = Join-Path $AttemptRoot 'preflight'
New-Item -ItemType Directory -Force -Path $commandsDir, $preflightDir | Out-Null
$stdoutPath = Join-Path $commandsDir "$SourceName-install-01.stdout.bin"
$stderrPath = Join-Path $commandsDir "$SourceName-install-01.stderr.bin"
$receiptPath = Join-Path $commandsDir "$SourceName-install-01.receipt.json"
$resolverPath = Join-Path $preflightDir "$SourceName-install-runtime.json"
$lockPath = Join-Path $sourceApp 'pnpm-lock.yaml'
$startedUtc = [DateTime]::UtcNow.ToString('o')

function Get-Sha256([string]$Path) {
  (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$pinnedNodeHash = Get-Sha256 $nodeExe
$pinnedPnpmHash = Get-Sha256 $pnpmCli
$lockBeforeHash = Get-Sha256 $lockPath
$directNodePath = (& $nodeExe -p 'process.execPath').Trim()
$directNodeVersion = (& $nodeExe -p 'process.version').Trim()
$commandNodePath = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$whereNodePath = (where.exe node | Select-Object -First 1).Trim()
$packageNodePath = (& $nodeExe $pnpmCli exec node -p 'process.execPath').Trim()
$packageNodeVersion = (& $nodeExe $pnpmCli exec node -p 'process.version').Trim()
$pnpmVersion = (& $nodeExe $pnpmCli --version).Trim()
$pathSuffix = $env:PATH.Substring($nodeDir.Length + 1)
$pathSuffixBytes = [Text.Encoding]::UTF8.GetBytes($pathSuffix)
$sha = [Security.Cryptography.SHA256]::Create()
try { $pathSuffixHash = ([BitConverter]::ToString($sha.ComputeHash($pathSuffixBytes))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
$resolver = [ordered]@{
  sourceName = $SourceName
  sourceRoot = [IO.Path]::GetFullPath($SourceRoot)
  resolverWorkingDirectory = [IO.Path]::GetFullPath((Get-Location).Path)
  startedUtc = $startedUtc
  pinnedNodePath = $nodeExe
  pinnedNodeSha256 = $pinnedNodeHash
  directNodePath = $directNodePath
  directNodeVersion = $directNodeVersion
  getCommandNodePath = $commandNodePath
  whereFirstNodePath = $whereNodePath
  packageScriptNodePath = $packageNodePath
  packageScriptNodeVersion = $packageNodeVersion
  pinnedPnpmPath = $pnpmCli
  pinnedPnpmSha256 = $pinnedPnpmHash
  pinnedPnpmVersion = $pnpmVersion
  pathPrefix = $nodeDir
  pathSuffixSha256 = $pathSuffixHash
  pathSuffixCharacters = $pathSuffix.Length
  resolverPass = (($pinnedNodeHash -eq '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237') -and
    ($pinnedPnpmHash -eq '98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090') -and
    ($pnpmVersion -eq '9.15.9') -and
    ($directNodePath -eq $nodeExe) -and ($directNodeVersion -eq 'v24.19.0') -and
    ($commandNodePath -eq $nodeExe) -and ($whereNodePath -eq $nodeExe) -and
    ($packageNodePath -eq $nodeExe) -and ($packageNodeVersion -eq 'v24.19.0'))
}
$resolver | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resolverPath -Encoding UTF8
if (-not $resolver.resolverPass) { throw "Pinned Node/pnpm resolver did not pass for $SourceName; install was not launched." }

$pnpmArgs = "`"$pnpmCli`" install --frozen-lockfile"
$process = Start-Process -FilePath $nodeExe -ArgumentList $pnpmArgs -WorkingDirectory $sourceApp -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru -Wait -NoNewWindow
$exitCode = $process.ExitCode
$endedUtc = [DateTime]::UtcNow.ToString('o')
$lockAfterHash = Get-Sha256 $lockPath
$stdoutBytes = if (Test-Path -LiteralPath $stdoutPath) { (Get-Item -LiteralPath $stdoutPath).Length } else { 0 }
$stderrBytes = if (Test-Path -LiteralPath $stderrPath) { (Get-Item -LiteralPath $stderrPath).Length } else { 0 }
$receipt = [ordered]@{
  sourceName = $SourceName
  sourceRoot = [IO.Path]::GetFullPath($SourceRoot)
  command = 'node.exe pnpm.cjs install --frozen-lockfile'
  argv = @($nodeExe, $pnpmCli, 'install', '--frozen-lockfile')
  workingDirectory = [IO.Path]::GetFullPath($sourceApp)
  startedUtc = $startedUtc
  endedUtc = $endedUtc
  wrapperPid = $PID
  installNodePid = $process.Id
  exitCode = $exitCode
  nodePath = $nodeExe
  nodeVersion = $directNodeVersion
  nodeSha256 = $pinnedNodeHash
  pnpmPath = $pnpmCli
  pnpmVersion = $resolver.pinnedPnpmVersion
  pnpmSha256 = $pinnedPnpmHash
  pathPrefix = $nodeDir
  pathSuffixSha256 = $pathSuffixHash
  lockfile = 'pnpm-lock.yaml'
  lockfileSha256Before = $lockBeforeHash
  lockfileSha256After = $lockAfterHash
  lockfileUnchanged = ($lockBeforeHash -eq $lockAfterHash)
  stdoutPath = $stdoutPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stdoutBytes = $stdoutBytes
  stdoutSha256 = if (Test-Path -LiteralPath $stdoutPath) { Get-Sha256 $stdoutPath } else { $null }
  stderrPath = $stderrPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stderrBytes = $stderrBytes
  stderrSha256 = if (Test-Path -LiteralPath $stderrPath) { Get-Sha256 $stderrPath } else { $null }
}
$receipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
if ($exitCode -ne 0) { exit $exitCode }
