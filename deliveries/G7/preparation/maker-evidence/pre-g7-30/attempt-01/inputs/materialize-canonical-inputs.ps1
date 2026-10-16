Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo='C:\p30-maker-20261016'
$base=Join-Path $repo 'deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01\inputs'
$maps=@(
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/frozen-artifact-bindings.json';dest='p28/frozen-artifact-bindings.json'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/inputs/input-binding.json';dest='p28/input-binding.json'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/observer/P28RenderAttribution.ts';dest='p28/P28RenderAttribution.ts'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/harness/p28-render-attribution.spec.ts';dest='p28/p28-render-attribution.spec.ts'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/harness/p28-render-attribution.config.ts';dest='p28/p28-render-attribution.config.ts'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/overlays/accepted-root-500.WorldRuntime.patch';dest='p28/accepted-root-500.WorldRuntime.patch'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/overlays/p25-donor-28fb.WorldRuntime.patch';dest='p28/p25-donor-28fb.WorldRuntime.patch'},
  @{rev='7b1729d52b076b4643017eceec302f4654714f0a';path='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/REPORT.md';dest='p28/REPORT.md'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/REPORT.md';dest='p29/REPORT.md'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/REPORT.md';dest='p29/attempt-01-REPORT.md'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/frozen-inputs.json';dest='p29/frozen-inputs.json'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/capture-matrix.json';dest='p29/capture-matrix.json'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/commands/accepted-root-500-build-01.receipt.json';dest='p29/accepted-root-500-build-01.receipt.json'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/commands/accepted-root-500-build-01.stdout.bin';dest='p29/accepted-root-500-build-01.stdout.bin'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/commands/accepted-root-500-build-01.stderr.bin';dest='p29/accepted-root-500-build-01.stderr.bin'},
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/commands/source-worktree-restoration.json';dest='p29/source-worktree-restoration.json'}
  @{rev='bd72e9544832351de289d5c5a9cbaefed6b836db';path='deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/commands/pinned-runtime-probe-attempt-02.ps1';dest='p29/pinned-runtime-probe-attempt-02.ps1'}
)
$git=(Get-Command git.exe).Source
$records=New-Object 'System.Collections.Generic.List[object]'
foreach($map in $maps){
  $target=Join-Path $base $map.dest
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target)|Out-Null
  $objectSpec=$map.rev+':'+$map.path
  $blobId=(& $git -C $repo rev-parse $objectSpec).Trim()
  if($LASTEXITCODE -ne 0 -or -not $blobId){throw "Could not resolve Git blob: $objectSpec"}
  $expectedSize=[int64]((& $git -C $repo cat-file -s $blobId).Trim())
  if($LASTEXITCODE -ne 0){throw "Could not resolve Git blob size: $blobId"}
  $psi=New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName=$git
  $psi.Arguments='-C '+$repo+' cat-file blob '+$blobId
  $psi.WorkingDirectory=$repo
  $psi.UseShellExecute=$false
  $psi.CreateNoWindow=$true
  $psi.RedirectStandardOutput=$true
  $psi.RedirectStandardError=$true
  $proc=New-Object System.Diagnostics.Process
  $proc.StartInfo=$psi
  if(-not $proc.Start()){throw "git cat-file failed to start: $objectSpec"}
  $errTask=$proc.StandardError.ReadToEndAsync()
  $outFile=[IO.File]::Open($target,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try{$proc.StandardOutput.BaseStream.CopyTo($outFile);$outFile.Flush()}finally{$outFile.Dispose()}
  $proc.WaitForExit()
  $stderr=$errTask.GetAwaiter().GetResult()
  if($proc.ExitCode -ne 0){throw "git cat-file failed ($($proc.ExitCode)): $objectSpec $stderr"}
  $item=Get-Item -LiteralPath $target
  if($item.Length -ne $expectedSize){throw "Materialized length mismatch for $($objectSpec): $($item.Length) != $expectedSize"}
  $sha=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
  $records.Add([ordered]@{source=($map.rev+':'+$map.path);gitBlobId=$blobId;bytes=$item.Length;rawSha256=$sha;copyPath=$map.dest})
}
$manifest=[ordered]@{schemaVersion=1;source='git cat-file blob, canonical commit object bytes';inputs=@($records.ToArray())}
$utf8=New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $base 'canonical-input-copy-manifest.json'),(ConvertTo-Json -InputObject $manifest -Depth 20)+"`n",$utf8)
$manifestHash=(Get-FileHash (Join-Path $base 'canonical-input-copy-manifest.json') -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output ("Materialized {0} canonical inputs; manifest SHA256 {1}" -f $records.Count,$manifestHash)