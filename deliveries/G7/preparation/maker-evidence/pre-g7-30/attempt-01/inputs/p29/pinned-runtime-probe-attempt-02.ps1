param([Parameter(Mandatory=$true)][string]$SourceName,[Parameter(Mandatory=$true)][string]$SourceRoot,[Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
$nodeExe='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$nodeDir=Split-Path -Parent $nodeExe
$pnpmCjs='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$originalPath=$env:PATH
$env:PATH=$nodeDir+';'+$originalPath
Set-Location (Join-Path $SourceRoot 'app')
$commandInfo=Get-Command node -CommandType Application -ErrorAction Stop
$commandPath=$commandInfo.Path
$wherePaths=@(& where.exe node | ForEach-Object { ([string]$_).Trim() })
$nodeVersion=([string](& node --version)).Trim()
$nodeExecPath=([string](& node -p process.execPath)).Trim()
$nodeHash=(Get-FileHash -LiteralPath $nodeExe -Algorithm SHA256).Hash.ToLowerInvariant()
$pnpmVersion=([string](& $nodeExe $pnpmCjs --version)).Trim()
$pnpmExit=$LASTEXITCODE
$packageNodePath=([string](& $nodeExe $pnpmCjs exec node -p process.execPath)).Trim()
$packagePathExit=$LASTEXITCODE
$packageNodeVersion=([string](& $nodeExe $pnpmCjs exec node -p process.version)).Trim()
$packageVersionExit=$LASTEXITCODE
$expectedNode=(Resolve-Path -LiteralPath $nodeExe).Path
$resolvedCommand=(Resolve-Path -LiteralPath $commandPath).Path
$resolvedWhere=if($wherePaths.Count -gt 0){(Resolve-Path -LiteralPath $wherePaths[0]).Path}else{''}
$resolvedDirect=(Resolve-Path -LiteralPath $nodeExecPath).Path
$pathBytes=[Text.Encoding]::UTF8.GetBytes($originalPath)
$sha=[Security.Cryptography.SHA256]::Create()
try{$suffixHash=([BitConverter]::ToString($sha.ComputeHash($pathBytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
$pass=($pnpmExit -eq 0 -and $packagePathExit -eq 0 -and $packageVersionExit -eq 0 -and $nodeVersion -eq 'v24.19.0' -and $nodeHash -eq '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237' -and $resolvedCommand -ieq $expectedNode -and $resolvedWhere -ieq $expectedNode -and $resolvedDirect -ieq $expectedNode -and $pnpmVersion -eq '9.15.9' -and $packageNodePath -ieq $expectedNode -and $packageNodeVersion -eq 'v24.19.0')
$record=[ordered]@{
  schemaVersion=1;status=if($pass){'PASS'}else{'FAIL'};source=$SourceName;sourceCommit=(git -C $SourceRoot rev-parse HEAD).Trim();sourceRoot=$SourceRoot;workingDirectory=(Get-Location).Path
  pinnedNodePath=$nodeExe;pinnedNodeDirectory=$nodeDir;pinnedNodeSha256=$nodeHash
  pnpmEntryPath=$pnpmCjs;pnpmVersion=$pnpmVersion;pnpmExitCode=$pnpmExit
  pathPrefix=$nodeDir+';';pathRemainderUnchanged=$true;originalPathSuffixSha256=$suffixHash
  getCommandNodePath=$commandPath;whereNodePaths=$wherePaths;nodeVersion=$nodeVersion;nodeExecPath=$nodeExecPath
  pnpmExecNodePath=$packageNodePath;pnpmExecNodeVersion=$packageNodeVersion;pnpmExecNodePathExitCode=$packagePathExit;pnpmExecNodeVersionExitCode=$packageVersionExit
  comparisons=[ordered]@{getCommandMatchesPinned=($resolvedCommand -ieq $expectedNode);whereFirstMatchesPinned=($resolvedWhere -ieq $expectedNode);directExecMatchesPinned=($resolvedDirect -ieq $expectedNode);packageExecMatchesPinned=($packageNodePath -ieq $expectedNode);allVersionsMatchPinned=($nodeVersion -eq 'v24.19.0' -and $packageNodeVersion -eq 'v24.19.0' -and $pnpmVersion -eq '9.15.9')}
  recordedAtUtc=(Get-Date).ToUniversalTime().ToString('o')
}
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding utf8
if(-not $pass){throw "Pinned runtime resolver failed for $SourceName. See $OutputPath"}
"PASS $SourceName; Node $nodeVersion; pnpm $pnpmVersion; PATH node $resolvedWhere; package Node $packageNodePath $packageNodeVersion"
