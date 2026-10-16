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
$env:NEXT_PUBLIC_PRE_G7_13_EVIDENCE = '1'
$env:NEXT_TELEMETRY_DISABLED = '1'
$sourceApp = Join-Path $SourceRoot 'app'
Set-Location -LiteralPath $sourceApp
$commandsDir = Join-Path $AttemptRoot 'commands'
$preflightDir = Join-Path $AttemptRoot 'preflight'
New-Item -ItemType Directory -Force -Path $commandsDir, $preflightDir | Out-Null
$stdoutPath = Join-Path $commandsDir "$SourceName-build-01.stdout.bin"
$stderrPath = Join-Path $commandsDir "$SourceName-build-01.stderr.bin"
$receiptPath = Join-Path $commandsDir "$SourceName-build-01.receipt.json"
$resolverPath = Join-Path $preflightDir "$SourceName-build-runtime-resolver.json"
$startedUtc = [DateTime]::UtcNow.ToString('o')

function Get-Sha256([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Get-Descendants([int]$RootPid) {
  $all = @(Get-CimInstance Win32_Process)
  $ids = @([int]$RootPid)
  $changed = $true
  while ($changed) {
    $priorCount = $ids.Count
    foreach ($candidate in $all) {
      if (($ids -contains [int]$candidate.ParentProcessId) -and ($ids -notcontains [int]$candidate.ProcessId)) { $ids += [int]$candidate.ProcessId }
    }
    $changed = ($ids.Count -gt $priorCount)
  }
  @($all | Where-Object { $ids -contains [int]$_.ProcessId })
}

# Gate builds on this source's one successful frozen install and both required preflights.
$installReceipt = Join-Path $commandsDir "$SourceName-install-01.receipt.json"
$typecheckSuffix = if ($SourceName -eq 'accepted-root-500') { 'typecheck-02' } else { 'typecheck-01' }
$typecheckReceipt = Join-Path $commandsDir "$SourceName-$typecheckSuffix.receipt.json"
$listReceipt = Join-Path $commandsDir "$SourceName-playwright-list-01.receipt.json"
foreach ($path in @($installReceipt, $typecheckReceipt, $listReceipt)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Required source receipt missing; build not launched: $path" }
}
$installState = Get-Content -Raw -LiteralPath $installReceipt | ConvertFrom-Json
$typecheckState = Get-Content -Raw -LiteralPath $typecheckReceipt | ConvertFrom-Json
$listState = Get-Content -Raw -LiteralPath $listReceipt | ConvertFrom-Json
if ($installState.exitCode -ne 0 -or -not $installState.lockfileUnchanged -or
    $typecheckState.childExitCode -ne 0 -or -not $typecheckState.resolverPass -or
    $listState.childExitCode -ne 0 -or -not $listState.resolverPass -or $listState.observedListRows -ne 8) {
  throw "Required source install/preflight gate failed; build not launched for $SourceName."
}
$frozenPath = Join-Path $AttemptRoot 'frozen-inputs.json'
if (-not (Test-Path -LiteralPath $frozenPath)) { throw 'Frozen P29 input manifest missing; build not launched.' }
$frozen = Get-Content -Raw -LiteralPath $frozenPath | ConvertFrom-Json
$sourceBinding = @($frozen.sources | Where-Object name -eq $SourceName | Select-Object -First 1)[0]
if ($null -eq $sourceBinding) { throw "Frozen P29 manifest lacks source $SourceName; build not launched." }

$nodeHash = Get-Sha256 $nodeExe
$pnpmHash = Get-Sha256 $pnpmCli
$directNodePathOutput = @(& $nodeExe -p 'process.execPath')
$directNodePathExitCode = $LASTEXITCODE
$directNodePath = ($directNodePathOutput -join [Environment]::NewLine).Trim()
$directNodeVersionOutput = @(& $nodeExe -p 'process.version')
$directNodeVersionExitCode = $LASTEXITCODE
$directNodeVersion = ($directNodeVersionOutput -join [Environment]::NewLine).Trim()
$firstCommandNode = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$whereNodeOutput = @(where.exe node)
$whereNodeExitCode = $LASTEXITCODE
$whereNode = if ($whereNodeOutput.Count -gt 0) { $whereNodeOutput[0].Trim() } else { $null }
$packageNodePathOutput = @(& $nodeExe $pnpmCli exec node -p 'process.execPath')
$packageNodePathExitCode = $LASTEXITCODE
$packageNodePath = ($packageNodePathOutput -join [Environment]::NewLine).Trim()
$packageNodeVersionOutput = @(& $nodeExe $pnpmCli exec node -p 'process.version')
$packageNodeVersionExitCode = $LASTEXITCODE
$packageNodeVersion = ($packageNodeVersionOutput -join [Environment]::NewLine).Trim()
$pnpmVersionOutput = @(& $nodeExe $pnpmCli --version)
$pnpmVersionExitCode = $LASTEXITCODE
$pnpmVersion = ($pnpmVersionOutput -join [Environment]::NewLine).Trim()
$resolverProbeExitCodes = [ordered]@{
  directNodePath = $directNodePathExitCode
  directNodeVersion = $directNodeVersionExitCode
  whereFirstNode = $whereNodeExitCode
  packageNodePath = $packageNodePathExitCode
  packageNodeVersion = $packageNodeVersionExitCode
  pnpmVersion = $pnpmVersionExitCode
}
$resolverExitCodesPass = @($resolverProbeExitCodes.Values | Where-Object { $_ -ne 0 }).Count -eq 0
$pathSuffix = $env:PATH.Substring($nodeDir.Length + 1)
$pathSha = [Security.Cryptography.SHA256]::Create()
try { $pathSuffixHash = ([BitConverter]::ToString($pathSha.ComputeHash([Text.Encoding]::UTF8.GetBytes($pathSuffix)))).Replace('-', '').ToLowerInvariant() } finally { $pathSha.Dispose() }
$resolverPass = (($nodeHash -eq '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237') -and
  ($pnpmHash -eq '98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090') -and ($resolverExitCodesPass) -and
  ($directNodePath -eq $nodeExe) -and ($directNodeVersion -eq 'v24.19.0') -and
  ($firstCommandNode -eq $nodeExe) -and ($whereNode -eq $nodeExe) -and
  ($packageNodePath -eq $nodeExe) -and ($packageNodeVersion -eq 'v24.19.0') -and ($pnpmVersion -eq '9.15.9'))
$resolver = [ordered]@{
  sourceName = $SourceName
  sourceApp = [IO.Path]::GetFullPath($sourceApp)
  startedUtc = $startedUtc
  pinnedNodePath = $nodeExe
  pinnedNodeSha256 = $nodeHash
  directNodePath = $directNodePath
  directNodeVersion = $directNodeVersion
  getCommandFirstNodePath = $firstCommandNode
  whereFirstNodePath = $whereNode
  packageScriptNodePath = $packageNodePath
  packageScriptNodeVersion = $packageNodeVersion
  pinnedPnpmPath = $pnpmCli
  pinnedPnpmSha256 = $pnpmHash
  pinnedPnpmVersion = $pnpmVersion
  resolverProbeExitCodes = $resolverProbeExitCodes
  resolverExitCodesPass = $resolverExitCodesPass
  pathPrefix = $nodeDir
  pathSuffixSha256 = $pathSuffixHash
  resolverPass = $resolverPass
}
$resolver | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resolverPath -Encoding UTF8
if (-not $resolverPass) { throw "Pinned resolver failed for $SourceName/build; build was not launched." }

$sourceCommit = (& git -C $SourceRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceCommit -ne $sourceBinding.sourceCommit) { throw "Source commit does not match frozen binding; build not launched." }
$sourceRootTree = (& git -C $SourceRoot write-tree).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceRootTree -ne $sourceBinding.temporaryRootTree) { throw "Temporary source tree does not match frozen binding; build not launched." }
$rootTreeEntries = @(& git -C $SourceRoot ls-tree $sourceRootTree app yorayriniwnl.in)
$rootTreeEntriesExitCode = $LASTEXITCODE
$appTree = (($rootTreeEntries | Where-Object { $_ -match "`tapp$" }) -split '\s+')[2]
$mirrorTree = (($rootTreeEntries | Where-Object { $_ -match "`tyorayriniwnl\.in$" }) -split '\s+')[2]
if ($rootTreeEntriesExitCode -ne 0 -or $appTree -ne $sourceBinding.temporaryAppTree -or $mirrorTree -ne $sourceBinding.temporaryMirrorTree) { throw "Temporary app/mirror tree does not match frozen binding; build not launched." }
$outputDir = Join-Path $sourceApp '.next'
$outputWasPresent = Test-Path -LiteralPath $outputDir
if ($outputWasPresent) { throw "Build output directory already exists; refusing a non-fresh production build: $outputDir" }
$buildPort = if ($SourceName -eq 'accepted-root-500') { 3291 } else { 3292 }
$envAllowlist = [ordered]@{
  NEXT_PUBLIC_PRE_G7_13_EVIDENCE = $env:NEXT_PUBLIC_PRE_G7_13_EVIDENCE
  NEXT_TELEMETRY_DISABLED = $env:NEXT_TELEMETRY_DISABLED
  CI = if (Test-Path Env:CI) { $env:CI } else { $null }
  NODE_ENV = if (Test-Path Env:NODE_ENV) { $env:NODE_ENV } else { $null }
  NODE_OPTIONS = if (Test-Path Env:NODE_OPTIONS) { 'PRESENT_REDACTED' } else { $null }
  TZ = if (Test-Path Env:TZ) { $env:TZ } else { $null }
}
$environmentVariableNames = @(Get-ChildItem Env: | Select-Object -ExpandProperty Name | Sort-Object)

$arguments = "`"$pnpmCli`" run build"
$process = Start-Process -FilePath $nodeExe -ArgumentList $arguments -WorkingDirectory $sourceApp -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru -NoNewWindow
$observedNodes = @{}
$snapshots = @()
$monitoringError = $null
$nodeProcessesPinned = $true
$allNodeProcessesObserved = $true
$launchNodeHash = $nodeHash
$observedNodes[[string]$process.Id] = [ordered]@{
  processId = $process.Id
  parentProcessId = $PID
  executablePath = $nodeExe
  executableSha256 = $nodeHash
  executableVersion = $directNodeVersion
  cimObserved = $false
  commandLine = "`"$nodeExe`" `"$pnpmCli`" run build"
  discovery = 'Start-Process direct executable'
}
while (-not $process.HasExited) {
  try {
    $descendants = @(Get-Descendants $process.Id)
    $seenIds = @()
    foreach ($child in $descendants) {
      $seenIds += [int]$child.ProcessId
      if ($child.Name -ieq 'node.exe') {
        $key = [string]$child.ProcessId
        $exePath = $child.ExecutablePath
        $exeHash = $null
        if (-not [string]::IsNullOrWhiteSpace($exePath)) { try { $exeHash = Get-Sha256 $exePath } catch { $exeHash = $null } }
        $version = if ($exePath -eq $nodeExe -and $exeHash -eq $nodeHash) { 'v24.19.0' } else { 'UNVERIFIED' }
        if (-not $observedNodes.ContainsKey($key)) {
          $observedNodes[$key] = [ordered]@{
            processId = [int]$child.ProcessId
            parentProcessId = [int]$child.ParentProcessId
            executablePath = $exePath
            executableSha256 = $exeHash
            executableVersion = $version
            cimObserved = $true
            commandLine = $child.CommandLine
            discovery = 'CIM descendant poll'
          }
        } else {
          $observedNodes[$key].observedExecutablePath = $exePath
          $observedNodes[$key].observedExecutableSha256 = $exeHash
          $observedNodes[$key].observedExecutableVersion = $version
          $observedNodes[$key].cimObserved = $true
        }
        if ($version -ne 'v24.19.0') { $nodeProcessesPinned = $false; if ([string]::IsNullOrWhiteSpace($exePath)) { $allNodeProcessesObserved = $false } }
      }
    }
    $snapshots += [ordered]@{ sampledUtc = [DateTime]::UtcNow.ToString('o'); descendantPids = $seenIds; nodePids = @($observedNodes.Keys) }
  } catch {
    $monitoringError = $_.Exception.Message
    $allNodeProcessesObserved = $false
  }
  $process.Refresh()
  if (-not $process.HasExited) { Start-Sleep -Milliseconds 200 }
}
$process.WaitForExit()
$exitCode = $process.ExitCode
$endedUtc = [DateTime]::UtcNow.ToString('o')
$stdoutBytes = (Get-Item -LiteralPath $stdoutPath).Length
$stderrBytes = (Get-Item -LiteralPath $stderrPath).Length
$stdoutHash = Get-Sha256 $stdoutPath
$stderrHash = Get-Sha256 $stderrPath
$rootObservedByCim = ($observedNodes[[string]$process.Id].cimObserved -eq $true)
if (-not $rootObservedByCim) { $allNodeProcessesObserved = $false }
$postBuildRootTree = (& git -C $SourceRoot write-tree).Trim()
$postBuildTreeExitCode = $LASTEXITCODE
$postBuildRootTreeEntries = @(& git -C $SourceRoot ls-tree $postBuildRootTree app yorayriniwnl.in)
$postBuildEntriesExitCode = $LASTEXITCODE
$postBuildAppTree = (($postBuildRootTreeEntries | Where-Object { $_ -match '\sapp$' }) -split '\s+')[2]
$postBuildMirrorTree = (($postBuildRootTreeEntries | Where-Object { $_ -match '\syorayriniwnl\.in$' }) -split '\s+')[2]
$sourceTreeUnchanged = ($postBuildTreeExitCode -eq 0 -and $postBuildEntriesExitCode -eq 0 -and
  $postBuildRootTree -eq $sourceBinding.temporaryRootTree -and
  $postBuildAppTree -eq $sourceBinding.temporaryAppTree -and
  $postBuildMirrorTree -eq $sourceBinding.temporaryMirrorTree)
$runtimeQualified = ($resolverPass -and $nodeProcessesPinned -and $allNodeProcessesObserved -and $observedNodes.Count -ge 1 -and $rootObservedByCim -and $sourceTreeUnchanged -and [string]::IsNullOrEmpty($monitoringError))
$receipt = [ordered]@{
  sourceName = $SourceName
  sourceCommit = $sourceCommit
  sourceRootTree = $sourceRootTree
  sourceTreeAfterBuild = $postBuildRootTree
  sourceAppTreeAfterBuild = $postBuildAppTree
  sourceMirrorTreeAfterBuild = $postBuildMirrorTree
  sourceTreeAfterBuildExitCodes = [ordered]@{ rootTree=$postBuildTreeExitCode; entries=$postBuildEntriesExitCode }
  sourceTreeUnchanged = $sourceTreeUnchanged
  appTree = $appTree
  mirrorTree = $mirrorTree
  sourceRootTreeEntryExitCode = $rootTreeEntriesExitCode
  temporaryWorktreeRoot = [IO.Path]::GetFullPath($SourceRoot)
  workingDirectory = [IO.Path]::GetFullPath($sourceApp)
  command = 'pnpm run build'
  argv = @($nodeExe, $pnpmCli, 'run', 'build')
  buildOutputDirectory = [IO.Path]::GetFullPath($outputDir)
  buildOutputDirectoryExistedBefore = $outputWasPresent
  captureServerPort = $buildPort
  startedUtc = $startedUtc
  endedUtc = $endedUtc
  wrapperPid = $PID
  buildNodePid = $process.Id
  childExitCode = $exitCode
  requiredTaskFlags = [ordered]@{ NEXT_PUBLIC_PRE_G7_13_EVIDENCE = '1'; NEXT_TELEMETRY_DISABLED = '1' }
  recordedEnvironment = $envAllowlist
  environmentVariableNames = $environmentVariableNames
  nodePath = $nodeExe
  nodeVersion = $directNodeVersion
  nodeSha256 = $nodeHash
  pnpmPath = $pnpmCli
  pnpmVersion = $pnpmVersion
  pnpmSha256 = $pnpmHash
  pathPrefix = $nodeDir
  pathSuffixSha256 = $pathSuffixHash
  getCommandFirstNodePath = $firstCommandNode
  whereFirstNodePath = $whereNode
  packageScriptNodePath = $packageNodePath
  packageScriptNodeVersion = $packageNodeVersion
  resolverPass = $resolverPass
  processTreePollIntervalMs = 200
  processTreeSnapshots = $snapshots
  nodeProcesses = @($observedNodes.Values)
  nodeProcessesPinned = $nodeProcessesPinned
  allNodeProcessesObserved = $allNodeProcessesObserved
  rootNodeObservedThroughCim = $rootObservedByCim
  monitoringError = $monitoringError
  completeNodeRuntimeQualification = $runtimeQualified
  stdoutPath = $stdoutPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stdoutBytes = $stdoutBytes
  stdoutSha256 = $stdoutHash
  stderrPath = $stderrPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stderrBytes = $stderrBytes
  stderrSha256 = $stderrHash
}
$receipt | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
if ($exitCode -ne 0) { exit $exitCode }



