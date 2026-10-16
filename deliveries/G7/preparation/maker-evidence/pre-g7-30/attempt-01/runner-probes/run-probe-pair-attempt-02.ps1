param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01'
$probeDir=Join-Path $root 'runner-probes-attempt-02'
$runner=Join-Path $root 'runner\run-child.ps1'
$node='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$nodeDir=Split-Path -Parent $node
$nodeHash=(Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant()
$nodeVersion=(& $node --version).Trim()
$runnerHost=(Get-Command powershell.exe).Source
$pathValue=$nodeDir+';'+$env:Path
$utf8=New-Object System.Text.UTF8Encoding($false)
$results=New-Object 'System.Collections.Generic.List[object]'
foreach($spec in @(@{label='exit-0';code=0},@{label='exit-23';code=23})) {
  $child=Join-Path $probeDir ('child-'+$spec.label+'.js')
  $requestPath=Join-Path $probeDir ($spec.label+'.request.json')
  $receiptPath=Join-Path $probeDir ($spec.label+'.receipt.json')
  $stdoutPath=Join-Path $probeDir ($spec.label+'.stdout.bin')
  $stderrPath=Join-Path $probeDir ($spec.label+'.stderr.bin')
  $runnerStdout=Join-Path $probeDir ($spec.label+'.runner.stdout.bin')
  $runnerStderr=Join-Path $probeDir ($spec.label+'.runner.stderr.bin')
  $request=[ordered]@{
    runId=('p30-controlled-'+$spec.label)
    filePath=$node
    arguments=@($child)
    workingDirectory=$probeDir
    stdoutPath=$stdoutPath
    stderrPath=$stderrPath
    receiptPath=$receiptPath
    environment=[ordered]@{PATH=$pathValue}
  }
  [IO.File]::WriteAllText($requestPath,(ConvertTo-Json -InputObject $request -Depth 8)+"`n",$utf8)
  $started=[DateTime]::UtcNow.ToString('o')
  $commandLine='"'+$runnerHost+'" -NoProfile -ExecutionPolicy Bypass -File "'+$runner+'" -RequestPath "'+$requestPath+'"'
  & $runnerHost -NoProfile -ExecutionPolicy Bypass -File $runner -RequestPath $requestPath 1> $runnerStdout 2> $runnerStderr
  $wrapperExit=$LASTEXITCODE
  $ended=[DateTime]::UtcNow.ToString('o')
  $actualReceipt=$null
  if(Test-Path -LiteralPath $receiptPath){$actualReceipt=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json}
  $expectedOut=Join-Path $probeDir ('expected-'+$spec.label+'.stdout.bin')
  $expectedErr=Join-Path $probeDir ('expected-'+$spec.label+'.stderr.bin')
  $outMatch=$false; $errMatch=$false
  if((Test-Path $stdoutPath) -and (Test-Path $expectedOut)){$outMatch=([Convert]::ToBase64String([IO.File]::ReadAllBytes($stdoutPath)) -ceq [Convert]::ToBase64String([IO.File]::ReadAllBytes($expectedOut)))}
  if((Test-Path $stderrPath) -and (Test-Path $expectedErr)){$errMatch=([Convert]::ToBase64String([IO.File]::ReadAllBytes($stderrPath)) -ceq [Convert]::ToBase64String([IO.File]::ReadAllBytes($expectedErr)))}
  $receiptExit=$null; $runnerReceiptExit=$null; $sampleCount=0; $monitorErrors=@()
  if($actualReceipt){$receiptExit=$actualReceipt.child.exitCode; $runnerReceiptExit=$actualReceipt.runnerExitCode; $sampleCount=$actualReceipt.processTreeMonitoring.sampleCount; $monitorErrors=@($actualReceipt.processTreeMonitoring.errors)}
  $result=[ordered]@{
    label=$spec.label
    expectedChildExitCode=$spec.code
    childExitCodeFromReceipt=$receiptExit
    runnerExitCodeFromReceipt=$runnerReceiptExit
    outerPowerShellExitCode=$wrapperExit
    runnerCommandLine=$commandLine
    runnerStartedUtc=$started
    runnerFinishedUtc=$ended
    nodePath=$node
    nodeVersion=$nodeVersion
    nodeSha256=$nodeHash
    pathPrefix=$nodeDir
    childStdoutExactMatch=$outMatch
    childStderrExactMatch=$errMatch
    processTreeSamples=$sampleCount
    processTreeMonitoringErrors=$monitorErrors
    requestPath=$requestPath
    receiptPath=$receiptPath
    stdoutPath=$stdoutPath
    stderrPath=$stderrPath
    runnerStdoutPath=$runnerStdout
    runnerStderrPath=$runnerStderr
  }
  $results.Add($result)
  [IO.File]::WriteAllText((Join-Path $probeDir ($spec.label+'.invocation.json')),(ConvertTo-Json -InputObject $result -Depth 12)+"`n",$utf8)
}
$pass=$true
foreach($r in $results){
  if($r.outerPowerShellExitCode -ne 0 -or $r.runnerExitCodeFromReceipt -ne 0 -or $r.childExitCodeFromReceipt -ne $r.expectedChildExitCode -or -not $r.childStdoutExactMatch -or -not $r.childStderrExactMatch -or $r.processTreeSamples -lt 1 -or $r.processTreeMonitoringErrors.Count -gt 0){$pass=$false}
}
$summary=[ordered]@{schemaVersion=1;startedUtc=$results[0].runnerStartedUtc;finishedUtc=$results[$results.Count-1].runnerFinishedUtc;status=if($pass){'PASS'}else{'FAIL'};nodePath=$node;nodeVersion=$nodeVersion;nodeSha256=$nodeHash;runnerPath=$runner;runnerSha256=(Get-FileHash $runner -Algorithm SHA256).Hash.ToLowerInvariant();probes=@($results.ToArray())}
[IO.File]::WriteAllText((Join-Path $probeDir 'probe-pair-result.json'),(ConvertTo-Json -InputObject $summary -Depth 20)+"`n",$utf8)
if(-not $pass){exit 1}
exit 0