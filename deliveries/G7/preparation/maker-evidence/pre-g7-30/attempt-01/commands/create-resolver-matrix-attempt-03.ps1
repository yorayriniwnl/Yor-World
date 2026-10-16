Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$commands='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01\commands'
$sources=@(
  [ordered]@{name='accepted-root-500-install-02';path='accepted-root-500-install-02-resolver\runtime-resolver.json';sourceRoot='D:\p30-source-500-install-02';sourceCommit='500d10fa5901be48d4ff877e608d65ba0e271bb9'},
  [ordered]@{name='p25-donor-28fb';path='p25-donor-28fb-runtime-resolver.json';sourceRoot='D:\p30-source-28fb';sourceCommit='28fb4187445206bcc62e2ef0ae2678e44ac6604b'}
)
$pinNode='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$nodeSha='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'
$pinPnpm='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$pnpmSha='98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090'
$results=New-Object 'System.Collections.Generic.List[object]'
foreach ($source in $sources) {
  $path=Join-Path $commands $source.path
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Raw resolver missing; matrix not written: $path" }
  $raw=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $checks=[ordered]@{
    GetCommandNodeMatchesPinned=(@($raw.comparisons.getCommandMatchesPinned) -contains $pinNode)
    WhereFirstMatchesPinned=($raw.comparisons.whereFirstMatchesPinned -eq $true)
    DirectNodeVersionAndExecPathPinned=($raw.comparisons.directExecMatchesPinned -eq $true -and $raw.nodeVersion -eq 'v24.19.0' -and [string]::Equals($raw.nodeExecPath,$pinNode,[System.StringComparison]::OrdinalIgnoreCase))
    PnpmVersionPinned=($raw.pnpmVersion -eq '9.15.9' -and $raw.pnpmExitCode -eq 0)
    PnpmExecNodePathPinned=($raw.comparisons.packageExecMatchesPinned -eq $true -and [string]::Equals($raw.pnpmExecNodePath,$pinNode,[System.StringComparison]::OrdinalIgnoreCase) -and $raw.pnpmExecNodePathExitCode -eq 0)
    PnpmExecNodeVersionPinned=($raw.pnpmExecNodeVersion -eq 'v24.19.0' -and $raw.pnpmExecNodeVersionExitCode -eq 0)
  }
  $falseCheckCount=0
  foreach ($checkValue in $checks.Values) { if ($checkValue -ne $true) { $falseCheckCount++ } }
  $allChecksPass=($falseCheckCount -eq 0)
  $results.Add([ordered]@{
    name=$source.name;sourceCommit=$source.sourceCommit;sourceRoot=$source.sourceRoot;workingDirectory=$raw.workingDirectory
    resolverPath=('attempt-01/commands/'+$source.path.Replace('\','/'));resolverBytes=(Get-Item -LiteralPath $path).Length;resolverSha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant();resolverStatus=$raw.status
    pinnedNodePath=$raw.pinnedNodePath;pinnedNodeSha256=$raw.pinnedNodeSha256;nodeVersion=$raw.nodeVersion;pnpmEntryPath=$raw.pnpmEntryPath;pnpmVersion=$raw.pnpmVersion;pnpmExecNodePath=$raw.pnpmExecNodePath;pnpmExecNodeVersion=$raw.pnpmExecNodeVersion
    checks=$checks;allSixPass=($allChecksPass -and $raw.status -eq 'PASS' -and $raw.pinnedNodeSha256 -eq $nodeSha -and $raw.pnpmEntryPath -eq $pinPnpm)
  })
}
$bad=@($results | Where-Object { -not $_.allSixPass })
if ($bad.Count -gt 0) { throw 'One or more raw resolver records did not pass all six checks; matrix not written' }
$acceptedResult=Join-Path $commands 'accepted-root-500-install-02-resolver\result.json'
$acceptedCorrected=Join-Path $commands 'accepted-root-500-install-02-resolver\result-corrected.json'
$captured=Get-Content -LiteralPath $acceptedResult -Raw | ConvertFrom-Json
$corrected=Get-Content -LiteralPath $acceptedCorrected -Raw | ConvertFrom-Json
$matrix=[ordered]@{
  schemaVersion=1;recordedUtc=[DateTime]::UtcNow.ToString('o');classification='derived from unchanged raw resolver JSON; no resolver rerun'
  pinnedNode=[ordered]@{path=$pinNode;version='v24.19.0';sha256=$nodeSha};pinnedPnpm=[ordered]@{path=$pinPnpm;version='9.15.9';sha256=$pnpmSha}
  activeSources=@($results.ToArray())
  wrapperSummaryDefect=[ordered]@{capturedResultPath='attempt-01/commands/accepted-root-500-install-02-resolver/result.json';capturedResultBytes=(Get-Item $acceptedResult).Length;capturedResultSha256=(Get-FileHash $acceptedResult -Algorithm SHA256).Hash.ToLowerInvariant();incorrectDerivedDirectCheck=$captured.checks.DirectNodeVersionAndExecPathPinned;authoritativeDirectCheck=$results[0].checks.DirectNodeVersionAndExecPathPinned;rawResolverPath='attempt-01/commands/accepted-root-500-install-02-resolver/runtime-resolver.json';rawResolverSha256=$results[0].resolverSha256;correctedDerivedSummaryPath='attempt-01/commands/accepted-root-500-install-02-resolver/result-corrected.json';correctedDerivedSummarySha256=(Get-FileHash $acceptedCorrected -Algorithm SHA256).Hash.ToLowerInvariant();note='The original result.json is retained unchanged. The corrected summary derives the direct check from the raw resolver comparisons.directExecMatchesPinned field and its exact nodeVersion/nodeExecPath.'}
}
$out=Join-Path $commands 'runtime-resolver-matrix-attempt-03.json'
$json=ConvertTo-Json -InputObject $matrix -Depth 20
[IO.File]::WriteAllText($out,$json+"`n",(New-Object System.Text.UTF8Encoding($false)))
Write-Output (ConvertTo-Json -InputObject ([ordered]@{status='PASS';output=$out;bytes=(Get-Item $out).Length;sha256=(Get-FileHash $out -Algorithm SHA256).Hash.ToLowerInvariant();acceptedAllSix=$results[0].allSixPass;donorAllSix=$results[1].allSixPass}) -Depth 8)
