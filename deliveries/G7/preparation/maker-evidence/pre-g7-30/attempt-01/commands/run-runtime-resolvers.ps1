Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01'
$resolver=Join-Path $root 'inputs\p29\pinned-runtime-probe-attempt-02.ps1'
$hostPath=(Get-Command powershell.exe).Source
$utf8=New-Object System.Text.UTF8Encoding($false)
$results=New-Object 'System.Collections.Generic.List[object]'
$sources=@(
  @{name='accepted-root-500';root='D:\p30-source-500'},
  @{name='p25-donor-28fb';root='D:\p30-source-28fb'}
)
foreach($source in $sources){
  $outPath=Join-Path $root ('commands\'+$source.name+'-runtime-resolver.json')
  $outStd=Join-Path $root ('commands\'+$source.name+'-runtime-resolver.stdout.bin')
  $outErr=Join-Path $root ('commands\'+$source.name+'-runtime-resolver.stderr.bin')
  $started=[DateTime]::UtcNow.ToString('o')
  $line='"'+$hostPath+'" -NoProfile -ExecutionPolicy Bypass -File "'+$resolver+'" -SourceName "'+$source.name+'" -SourceRoot "'+$source.root+'" -OutputPath "'+$outPath+'"'
  & $hostPath -NoProfile -ExecutionPolicy Bypass -File $resolver -SourceName $source.name -SourceRoot $source.root -OutputPath $outPath 1> $outStd 2> $outErr
  $exit=$LASTEXITCODE
  $ended=[DateTime]::UtcNow.ToString('o')
  $json=$null
  if(Test-Path $outPath){$json=Get-Content -LiteralPath $outPath -Raw|ConvertFrom-Json}
  $result=[ordered]@{
    source=$source.name;sourceRoot=$source.root;sourceCommit=(git -C $source.root rev-parse HEAD).Trim()
    commandLine=$line;startedUtc=$started;finishedUtc=$ended;outerPowerShellExitCode=$exit
    resolverJsonPath=$outPath;resolverJsonStatus=if($json){$json.status}else{'MISSING'}
    stdoutPath=$outStd;stdoutBytes=(Get-Item $outStd).Length;stdoutSha256=(Get-FileHash $outStd -Algorithm SHA256).Hash.ToLowerInvariant()
    stderrPath=$outErr;stderrBytes=(Get-Item $outErr).Length;stderrSha256=(Get-FileHash $outErr -Algorithm SHA256).Hash.ToLowerInvariant()
    pinnedNodePath=if($json){$json.pinnedNodePath}else{$null};pinnedNodeSha256=if($json){$json.pinnedNodeSha256}else{$null}
    pnpmVersion=if($json){$json.pnpmVersion}else{$null};packageNodePath=if($json){$json.pnpmExecNodePath}else{$null};packageNodeVersion=if($json){$json.pnpmExecNodeVersion}else{$null}
  }
  $results.Add($result)
  [IO.File]::WriteAllText((Join-Path $root ('commands\'+$source.name+'-runtime-resolver-launch.json')),(ConvertTo-Json -InputObject $result -Depth 12)+"`n",$utf8)
  if($exit -ne 0 -or -not $json -or $json.status -ne 'PASS'){break}
}
$summary=[ordered]@{schemaVersion=1;recordedUtc=[DateTime]::UtcNow.ToString('o');resolverScriptPath=$resolver;resolverScriptSha256=(Get-FileHash $resolver -Algorithm SHA256).Hash.ToLowerInvariant();results=@($results.ToArray());allPassed=($results.Count -eq 2 -and @($results|Where-Object{ $_.outerPowerShellExitCode -ne 0 -or $_.resolverJsonStatus -ne 'PASS'}).Count -eq 0)}
[IO.File]::WriteAllText((Join-Path $root 'commands\runtime-resolver-summary.json'),(ConvertTo-Json -InputObject $summary -Depth 16)+"`n",$utf8)
Write-Output (ConvertTo-Json -InputObject $summary -Depth 8)
if(-not $summary.allPassed){exit 1}
exit 0