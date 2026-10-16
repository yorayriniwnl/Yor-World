param(
  [Parameter(Mandatory=$true)][ValidateSet('accepted-root-500','p25-donor-28fb')][string]$SourceName,
  [Parameter(Mandatory=$true)][ValidateSet('install','typecheck','playwright-list')][string]$TaskName
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01'
$sourceRoot=if($SourceName -eq 'accepted-root-500'){'D:\p30-source-500'}else{'D:\p30-source-28fb'}
$app=Join-Path $sourceRoot 'app'
$node='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpm='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$nodeDir=Split-Path -Parent $node
$runner=Join-Path $root 'runner\run-child.ps1'
$hostPath=(Get-Command powershell.exe).Source
$taskArgs=switch($TaskName){
  'install' {@($pnpm,'install','--frozen-lockfile','--store-dir','D:\\pnpm-store-p30'); break}
  'typecheck' {@($pnpm,'run','typecheck'); break}
  'playwright-list' {@($pnpm,'exec','playwright','test','--config=p28-render-attribution.config.ts','--list'); break}
}
$runId="$SourceName-$TaskName"
$taskDir=Join-Path $root ('commands\'+$SourceName)
New-Item -ItemType Directory -Force -Path $taskDir | Out-Null
$requestPath=Join-Path $taskDir ($TaskName+'.request.json')
$receiptPath=Join-Path $taskDir ($TaskName+'.receipt.json')
$stdoutPath=Join-Path $taskDir ($TaskName+'.stdout.bin')
$stderrPath=Join-Path $taskDir ($TaskName+'.stderr.bin')
$runnerStd=Join-Path $taskDir ($TaskName+'.runner.stdout.bin')
$runnerErr=Join-Path $taskDir ($TaskName+'.runner.stderr.bin')
$outerPath=Join-Path $taskDir ($TaskName+'.outer.json')
$pathValue=$nodeDir+';'+$env:PATH
$environment=[ordered]@{PATH=$pathValue}
$request=[ordered]@{schemaVersion=1;runId=$runId;filePath=$node;arguments=@($taskArgs);workingDirectory=$app;stdoutPath=$stdoutPath;stderrPath=$stderrPath;receiptPath=$receiptPath;environment=$environment}
$utf8=New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($requestPath,(ConvertTo-Json -InputObject $request -Depth 10)+"`n",$utf8)
$started=[DateTime]::UtcNow.ToString('o')
$commandLine='"'+$hostPath+'" -NoProfile -ExecutionPolicy Bypass -File "'+$runner+'" -RequestPath "'+$requestPath+'"'
& $hostPath -NoProfile -ExecutionPolicy Bypass -File $runner -RequestPath $requestPath 1> $runnerStd 2> $runnerErr
$outerExit=$LASTEXITCODE
$ended=[DateTime]::UtcNow.ToString('o')
$receipt=$null
if(Test-Path -LiteralPath $receiptPath){$receipt=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json}
$commit=(git -C $sourceRoot rev-parse HEAD).Trim()
$rootTree=(git -C $sourceRoot write-tree).Trim()
$appTree=(git -C $sourceRoot rev-parse ($rootTree+':app')).Trim()
$mirrorTree=(git -C $sourceRoot rev-parse ($rootTree+':yorayriniwnl.in')).Trim()
$result=[ordered]@{
 schemaVersion=1;sourceName=$SourceName;sourceRoot=$sourceRoot;sourceCommit=$commit;temporaryRootTree=$rootTree;temporaryAppTree=$appTree;temporaryMirrorTree=$mirrorTree
 task=$TaskName;commandLine=$commandLine;nodePath=$node;nodeSha256=(Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant();nodeVersion=((& $node --version)|Out-String).Trim();pnpmPath=$pnpm;pnpmSha256=(Get-FileHash -LiteralPath $pnpm -Algorithm SHA256).Hash.ToLowerInvariant()
 startedUtc=$started;finishedUtc=$ended;outerPowerShellExitCode=$outerExit;childExitCode=if($receipt){$receipt.child.exitCode}else{$null};runnerExitCode=if($receipt){$receipt.runnerExitCode}else{$null};processTreeSamples=if($receipt){$receipt.processTreeMonitoring.sampleCount}else{$null};processTreeErrors=if($receipt){@($receipt.processTreeMonitoring.errors)}else{@('receipt missing')}
 requestPath=$requestPath;receiptPath=$receiptPath;stdoutPath=$stdoutPath;stdoutBytes=(Get-Item $stdoutPath).Length;stdoutSha256=(Get-FileHash $stdoutPath -Algorithm SHA256).Hash.ToLowerInvariant();stderrPath=$stderrPath;stderrBytes=(Get-Item $stderrPath).Length;stderrSha256=(Get-FileHash $stderrPath -Algorithm SHA256).Hash.ToLowerInvariant();runnerStdoutPath=$runnerStd;runnerStderrPath=$runnerErr
 lockfileSha256=(Get-FileHash (Join-Path $app 'pnpm-lock.yaml') -Algorithm SHA256).Hash.ToLowerInvariant();packageJsonSha256=(Get-FileHash (Join-Path $app 'package.json') -Algorithm SHA256).Hash.ToLowerInvariant()
}
[IO.File]::WriteAllText($outerPath,(ConvertTo-Json -InputObject $result -Depth 20)+"`n",$utf8)
Write-Output (ConvertTo-Json -InputObject $result -Depth 6)
if($outerExit -ne 0 -or -not $receipt -or $receipt.runnerExitCode -ne 0 -or $null -eq $receipt.child.exitCode){exit 70}
if($receipt.child.exitCode -ne 0){exit ([int]$receipt.child.exitCode)}
exit 0