param([Parameter(Mandatory=$true)][string]$SourceName,[Parameter(Mandatory=$true)][string]$SourceRoot,[Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
$nodeExe='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$nodeDir=Split-Path -Parent $nodeExe
$pnpmCjs='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$originalPath=$env:PATH
$env:PATH=$nodeDir+';'+$originalPath
Set-Location (Join-Path $SourceRoot 'app')
$cmd=(Get-Command node -CommandType Application -ErrorAction Stop).Source
$where=@(& where.exe node)
$version=& node --version
$execPath=& node -p 'process.execPath'
$execPathVersion=& node -p 'process.execPath + "|" + process.version'
$nodeHash=(Get-FileHash -LiteralPath $nodeExe -Algorithm SHA256).Hash.ToLowerInvariant()
$pnpmVersion=@(& $nodeExe $pnpmCjs --version)
$pnpmExit=$LASTEXITCODE
$packageNode=@(& $nodeExe $pnpmCjs exec node -p 'process.execPath + "|" + process.version')
$packageExit=$LASTEXITCODE
$expectedNodeDir=[IO.Path]::GetFullPath($nodeDir).TrimEnd('\')
$expectedNode=[IO.Path]::GetFullPath($nodeExe)
$normalizedCommand=[IO.Path]::GetFullPath($cmd)
$normalizedExec=[IO.Path]::GetFullPath(([string]$execPath).Trim())
$normalizedWhere=if($where.Count -gt 0){[IO.Path]::GetFullPath(([string]$where[0]).Trim())}else{''}
$pathRemainder=$originalPath
$pathBytes=[Text.Encoding]::UTF8.GetBytes($pathRemainder)
$pathHash=(Get-FileHash -LiteralPath $nodeExe -Algorithm SHA256).Hash.ToLowerInvariant()
$record=[ordered]@{
  schemaVersion=1
  source=$SourceName
  sourceRoot=$SourceRoot
  workingDirectory=(Get-Location).Path
  probeCommand='pinned Node 24.19.0 PATH resolver + pnpm exec node identity'
  pinnedNodePath=$nodeExe
  pinnedNodeDirectory=$nodeDir
  pinnedNodeSha256=$nodeHash
  pnpmEntryPath=$pnpmCjs
  pnpmVersion=(@($pnpmVersion) -join "`n")
  pnpmExitCode=$pnpmExit
  pathPrefix=$nodeDir+';'
  originalPathSuffixSha256=([BitConverter]::ToString([Security.Cryptography.SHA256]::HashData($pathBytes))).Replace('-','').ToLowerInvariant()
  getCommandNodePath=$cmd
  whereNodePaths=$where
  nodeVersion=$version
  nodeExecPath=([string]$execPath).Trim()
  nodeExecPathAndVersion=([string]$execPathVersion).Trim()
  packageEnvironmentNode=(@($packageNode) -join "`n")
  packageEnvironmentExitCode=$packageExit
  resolverPass=($pnpmExit -eq 0 -and $packageExit -eq 0 -and $version -eq 'v24.19.0' -and $nodeHash -eq '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237' -and $normalizedCommand -eq $expectedNode -and $normalizedWhere -eq $expectedNode -and $normalizedExec -eq $expectedNode -and $pnpmVersion -contains '9.15.9' -and $packageNode -contains ($expectedNode+'|v24.19.0'))
  recordedAtUtc=(Get-Date).ToUniversalTime().ToString('o')
}
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding utf8
if(-not $record.resolverPass){throw "Pinned resolver check failed for $SourceName. See $OutputPath"}
"PASS $SourceName; node=$version; pnpm=$pnpmVersion; where-first=$normalizedWhere; package-node=$packageNode"
