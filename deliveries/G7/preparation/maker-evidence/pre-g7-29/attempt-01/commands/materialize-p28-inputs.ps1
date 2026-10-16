$ErrorActionPreference='Stop'
$repo='C:\p29-maker-20261016'
$evidenceRoot='C:\p29-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-29'
$p28Commit='7b1729d52b076b4643017eceec302f4654714f0a'
$inputsRoot=Join-Path $evidenceRoot 'attempt-01\inputs\p28-canonical'
$files=@(
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/observer/P28RenderAttribution.ts';dest='observer/P28RenderAttribution.ts';role='measurement observer'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/harness/p28-render-attribution.spec.ts';dest='harness/p28-render-attribution.spec.ts';role='Playwright capture spec'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/harness/p28-render-attribution.config.ts';dest='harness/p28-render-attribution.config.ts';role='Playwright config'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/overlays/accepted-root-500.WorldRuntime.patch';dest='overlays/accepted-root-500.WorldRuntime.patch';role='accepted source observer connection overlay'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/overlays/p25-donor-28fb.WorldRuntime.patch';dest='overlays/p25-donor-28fb.WorldRuntime.patch';role='P25 donor observer connection overlay'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/inputs/input-binding.json';dest='contract/input-binding.json';role='P28 canonical measurement input binding'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/inputs/P26RenderAttribution.canonical.ts';dest='contract/P26RenderAttribution.canonical.ts';role='frozen P26 measurement contract'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/inputs/P27RenderAttribution.canonical.ts';dest='contract/P27RenderAttribution.canonical.ts';role='frozen P27 measurement contract'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/inputs/p27-render-attribution.spec.canonical.ts';dest='contract/p27-render-attribution.spec.canonical.ts';role='frozen P27 capture contract'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/frozen-artifact-bindings.json';dest='bindings/frozen-artifact-bindings.json';role='P28 frozen artifact manifest'},
  [pscustomobject]@{source='deliveries/G7/preparation/maker-evidence/pre-g7-28/REPORT.md';dest='bindings/P28-REPORT.md';role='P28 maker disposition'}
)
function Get-Sha256Hex([byte[]]$Bytes) { $sha=[Security.Cryptography.SHA256]::Create(); try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() } }
function Read-GitBlob([string]$Oid) {
  $psi=New-Object Diagnostics.ProcessStartInfo
  $psi.FileName='git'; $psi.Arguments='-C "'+$repo+'" cat-file blob '+$Oid; $psi.UseShellExecute=$false; $psi.RedirectStandardOutput=$true; $psi.RedirectStandardError=$true
  $p=New-Object Diagnostics.Process; $p.StartInfo=$psi; [void]$p.Start(); $m=New-Object IO.MemoryStream; $p.StandardOutput.BaseStream.CopyTo($m); $err=$p.StandardError.ReadToEnd(); $p.WaitForExit(); if($p.ExitCode -ne 0){throw $err}; $b=$m.ToArray(); $m.Dispose(); $p.Dispose(); return ,$b
}
$records=@()
foreach($file in $files){
  $oid=(& git -C $repo rev-parse "${p28Commit}:$($file.source)").Trim()
  if(-not $oid){throw "Missing P28 object: $($file.source)"}
  $bytes=Read-GitBlob $oid
  $dest=Join-Path $inputsRoot ($file.dest.Replace('/','\'))
  $parent=Split-Path -Parent $dest
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [IO.File]::WriteAllBytes($dest,$bytes)
  $copied=[IO.File]::ReadAllBytes($dest)
  if($copied.Length -ne $bytes.Length -or (Get-Sha256Hex $copied) -ne (Get-Sha256Hex $bytes)){throw "Byte-copy verification failed: $($file.dest)"}
  $records += [ordered]@{role=$file.role;p28Commit=$p28Commit;p28Path=$file.source;canonicalGitBlobId=$oid;canonicalBlobBytes=$bytes.Length;canonicalBlobSha256=(Get-Sha256Hex $bytes);copyPath=($dest.Substring($evidenceRoot.Length+1).Replace('\','/'));copyBytes=$copied.Length;copySha256=(Get-Sha256Hex $copied);byteIdentical=($copied.Length -eq $bytes.Length -and (Get-Sha256Hex $copied) -eq (Get-Sha256Hex $bytes))}
}
$manifest=[ordered]@{schemaVersion=1;p28Commit=$p28Commit;method='Each artifact was read from `git cat-file blob <P28-commit:path>` and copied as raw bytes; copy size and SHA-256 are rechecked.';entryCount=$records.Count;artifacts=$records}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidenceRoot 'attempt-01\p28-input-manifest.json') -Encoding utf8
"Copied $($records.Count) exact P28 commit blobs."
