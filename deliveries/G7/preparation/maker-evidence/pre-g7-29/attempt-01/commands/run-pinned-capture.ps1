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
$captureRoot = Join-Path (Join-Path $AttemptRoot 'captures') $SourceName
$resultsDir = Join-Path $captureRoot 'rows'
$playwrightDir = Join-Path $captureRoot 'playwright-output'
New-Item -ItemType Directory -Force -Path $commandsDir, $preflightDir, $resultsDir, $playwrightDir | Out-Null
$stdoutPath = Join-Path $commandsDir "$SourceName-playwright-01.stdout.bin"
$stderrPath = Join-Path $commandsDir "$SourceName-playwright-01.stderr.bin"
$receiptPath = Join-Path $commandsDir "$SourceName-playwright-01.receipt.json"
$resolverPath = Join-Path $preflightDir "$SourceName-capture-runtime-resolver.json"
$frozenPath = Join-Path $AttemptRoot 'frozen-inputs.json'
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

if (-not (Test-Path -LiteralPath $frozenPath)) { throw 'Frozen P29 input manifest is missing; capture was not launched.' }
$frozen = Get-Content -Raw -LiteralPath $frozenPath | ConvertFrom-Json
$sourceBinding = @($frozen.sources | Where-Object name -eq $SourceName | Select-Object -First 1)[0]
if ($null -eq $sourceBinding) { throw "Frozen P29 input manifest has no $SourceName binding; capture was not launched." }

# Gate this single capture on this exact source's successful build and complete Node qualification.
$buildReceiptPath = Join-Path $commandsDir "$SourceName-build-01.receipt.json"
if (-not (Test-Path -LiteralPath $buildReceiptPath)) { throw "Build receipt missing; capture was not launched for $SourceName." }
$buildState = Get-Content -Raw -LiteralPath $buildReceiptPath | ConvertFrom-Json
if ($buildState.childExitCode -ne 0 -or -not $buildState.completeNodeRuntimeQualification -or
    $buildState.sourceCommit -ne $sourceBinding.sourceCommit -or
    $buildState.sourceRootTree -ne $sourceBinding.temporaryRootTree) {
  throw "Build/runtime/source gate failed; capture was not launched for $SourceName."
}
$sourceTreeBeforeCapture = (& git -C $SourceRoot write-tree).Trim()
$sourceTreeBeforeCaptureExitCode = $LASTEXITCODE
if ($sourceTreeBeforeCaptureExitCode -ne 0 -or $sourceTreeBeforeCapture -ne $sourceBinding.temporaryRootTree) {
  throw "Current source tree does not match frozen binding; capture was not launched for $SourceName."
}

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
if (-not $resolverPass) { throw "Pinned resolver failed for $SourceName/capture; Playwright was not launched." }

$port = if ($SourceName -eq 'accepted-root-500') { 3291 } else { 3292 }
$env:P28_SERVER_PORT = [string]$port
$env:P28_PLAYWRIGHT_OUTPUT_DIR = $playwrightDir
$env:P28_ATTRIBUTION_OUTPUT_DIR = $resultsDir
$env:P28_ATTRIBUTION_SOURCE = $SourceName
$env:P28_ATTRIBUTION_COMMIT = $sourceBinding.sourceCommit
$env:P28_ATTRIBUTION_APP_TREE = $sourceBinding.baseAppTree
$env:P28_ATTRIBUTION_MIRROR_TREE = $sourceBinding.baseMirrorTree
$env:P28_ATTRIBUTION_TEMP_APP_TREE = $sourceBinding.temporaryAppTree
$env:P28_ATTRIBUTION_OBSERVER_SHA256 = $frozen.p28Artifacts.observer.sha256
$env:P28_ATTRIBUTION_OVERLAY_SHA256 = $sourceBinding.worldRuntimeRawSha256
$env:P28_ATTRIBUTION_HARNESS_SHA256 = $frozen.p28Artifacts.harnessSpec.sha256
$safeEnvironment = [ordered]@{
  P28_SERVER_PORT = $env:P28_SERVER_PORT
  P28_PLAYWRIGHT_OUTPUT_DIR = $env:P28_PLAYWRIGHT_OUTPUT_DIR
  P28_ATTRIBUTION_OUTPUT_DIR = $env:P28_ATTRIBUTION_OUTPUT_DIR
  P28_ATTRIBUTION_SOURCE = $env:P28_ATTRIBUTION_SOURCE
  P28_ATTRIBUTION_COMMIT = $env:P28_ATTRIBUTION_COMMIT
  P28_ATTRIBUTION_APP_TREE = $env:P28_ATTRIBUTION_APP_TREE
  P28_ATTRIBUTION_MIRROR_TREE = $env:P28_ATTRIBUTION_MIRROR_TREE
  P28_ATTRIBUTION_TEMP_APP_TREE = $env:P28_ATTRIBUTION_TEMP_APP_TREE
  P28_ATTRIBUTION_OBSERVER_SHA256 = $env:P28_ATTRIBUTION_OBSERVER_SHA256
  P28_ATTRIBUTION_OVERLAY_SHA256 = $env:P28_ATTRIBUTION_OVERLAY_SHA256
  P28_ATTRIBUTION_HARNESS_SHA256 = $env:P28_ATTRIBUTION_HARNESS_SHA256
  NEXT_PUBLIC_PRE_G7_13_EVIDENCE = $env:NEXT_PUBLIC_PRE_G7_13_EVIDENCE
  NEXT_TELEMETRY_DISABLED = $env:NEXT_TELEMETRY_DISABLED
}
$arguments = "`"$pnpmCli`" exec playwright test --config p28-render-attribution.config.ts"
$process = Start-Process -FilePath $nodeExe -ArgumentList $arguments -WorkingDirectory $sourceApp -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru -NoNewWindow
$observedNodes = @{}
$observedBrowsers = @{}
$snapshots = @()
$monitoringError = $null
$nodeProcessesPinned = $true
$allNodeProcessesObserved = $true
$observedNodes[[string]$process.Id] = [ordered]@{
  processId = $process.Id
  parentProcessId = $PID
  executablePath = $nodeExe
  executableSha256 = $nodeHash
  executableVersion = $directNodeVersion
  cimObserved = $false
  commandLine = "`"$nodeExe`" `"$pnpmCli`" exec playwright test --config p28-render-attribution.config.ts"
  discovery = 'Start-Process direct executable'
}
while (-not $process.HasExited) {
  try {
    $descendants = @(Get-Descendants $process.Id)
    $seenPids = @()
    foreach ($child in $descendants) {
      $seenPids += [int]$child.ProcessId
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
      if ($child.Name -match '^(chrome|msedge|firefox|chrome-headless-shell)(\.exe)?$') {
        $key = [string]$child.ProcessId
        if (-not $observedBrowsers.ContainsKey($key)) {
          $observedBrowsers[$key] = [ordered]@{
            processId = [int]$child.ProcessId
            parentProcessId = [int]$child.ParentProcessId
            name = $child.Name
            executablePath = $child.ExecutablePath
            commandLine = $child.CommandLine
          }
        }
      }
    }
    $snapshots += [ordered]@{
      sampledUtc = [DateTime]::UtcNow.ToString('o')
      descendantPids = $seenPids
      nodePids = @($observedNodes.Keys)
      browserPids = @($observedBrowsers.Keys)
    }
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
$temporaryRootTree = $sourceTreeAfterCapture
$rootObservedByCim = ($observedNodes[[string]$process.Id].cimObserved -eq $true)
if (-not $rootObservedByCim) { $allNodeProcessesObserved = $false }
$sourceTreeAfterCapture = (& git -C $SourceRoot write-tree).Trim()
$sourceTreeAfterCaptureExitCode = $LASTEXITCODE
$sourceTreeStable = ($sourceTreeAfterCaptureExitCode -eq 0 -and
  $sourceTreeBeforeCapture -eq $sourceTreeAfterCapture -and
  $sourceTreeAfterCapture -eq $sourceBinding.temporaryRootTree)
$runtimeQualified = ($resolverPass -and $nodeProcessesPinned -and $allNodeProcessesObserved -and $observedNodes.Count -ge 1 -and $rootObservedByCim -and $sourceTreeStable -and [string]::IsNullOrEmpty($monitoringError))
$receipt = [ordered]@{
  sourceName = $SourceName
  sourceCommit = $sourceBinding.sourceCommit
  sourceTreeBeforeCapture = $sourceTreeBeforeCapture
  sourceTreeAfterCapture = $sourceTreeAfterCapture
  sourceTreeStable = $sourceTreeStable
  sourceTreeExitCodes = [ordered]@{ before=$sourceTreeBeforeCaptureExitCode; after=$sourceTreeAfterCaptureExitCode }
  temporaryRootTree = $temporaryRootTree
  baseAppTree = $sourceBinding.baseAppTree
  temporaryAppTree = $sourceBinding.temporaryAppTree
  baseMirrorTree = $sourceBinding.baseMirrorTree
  command = 'pnpm exec playwright test --config p28-render-attribution.config.ts'
  argv = @($nodeExe, $pnpmCli, 'exec', 'playwright', 'test', '--config', 'p28-render-attribution.config.ts')
  workingDirectory = [IO.Path]::GetFullPath($sourceApp)
  startedUtc = $startedUtc
  endedUtc = $endedUtc
  wrapperPid = $PID
  playwrightNodePid = $process.Id
  childExitCode = $exitCode
  sourceEnvironment = $safeEnvironment
  config = [ordered]@{ workers = 1; retries = 0; timeoutMs = 30000; browserProjects = @('chrome', 'edge'); viewportRows = 4; freshContextPerRow = $true; deviceScaleFactorOverride = $false; mobileEmulationOverride = $false; qualityPreference = 'AUTO' }
  nodePath = $nodeExe
  nodeVersion = $directNodeVersion
  nodeSha256 = $nodeHash
  pnpmPath = $pnpmCli
  pnpmVersion = $pnpmVersion
  pnpmSha256 = $pnpmHash
  pathPrefix = $nodeDir
  pathSuffixSha256 = $pathSuffixHash
  packageScriptNodePath = $packageNodePath
  packageScriptNodeVersion = $packageNodeVersion
  resolverPass = $resolverPass
  processTreePollIntervalMs = 200
  processTreeSnapshots = $snapshots
  nodeProcesses = @($observedNodes.Values)
  nodeProcessesPinned = $nodeProcessesPinned
  allNodeProcessesObserved = $allNodeProcessesObserved
  rootNodeObservedThroughCim = $rootObservedByCim
  completeNodeRuntimeQualification = $runtimeQualified
  browserProcesses = @($observedBrowsers.Values)
  browserProcessCount = $observedBrowsers.Count
  monitoringError = $monitoringError
  resultsDirectory = $resultsDir
  playwrightOutputDirectory = $playwrightDir
  stdoutPath = $stdoutPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stdoutBytes = $stdoutBytes
  stdoutSha256 = $stdoutHash
  stderrPath = $stderrPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stderrBytes = $stderrBytes
  stderrSha256 = $stderrHash
}
$receipt | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
if ($exitCode -ne 0) { exit $exitCode }

