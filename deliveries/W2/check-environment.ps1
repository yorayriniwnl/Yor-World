$ErrorActionPreference = 'Stop'
$w2Root = $PSScriptRoot
$w2Scratch = (Get-Content -Raw -LiteralPath (Join-Path $w2Root 'evidence/r2/dependency-temp-path.txt')).Trim()
$data = [ordered]@{
    provider = 'OpenAI'
    model = 'GPT-6 (session developer identity; exact serving build not exposed)'
    functionalAlias = 'GPT-2 / W2 maker'
    filesystem = 'Direct local read and write demonstrated; owned root deliveries/W2'
    terminal = 'Native PowerShell; commands executed locally'
    database = 'No project database connection configured or tested; NOT RUN and not needed for W2'
    powerShellVersion = $PSVersionTable.PSVersion.ToString()
    python = (& python --version | Out-String).Trim()
    node = (& node --version | Out-String).Trim()
    npm = (& npm.cmd --version | Out-String).Trim()
    blender = (& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --version | Out-String).Trim()
    os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber
    cpu = Get-CimInstance Win32_Processor | Select-Object Name
    gpu = Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion
    scratch = $w2Scratch
    browsers = @('C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe') | ForEach-Object { $item=Get-Item -LiteralPath $_; @{path=$item.FullName;version=$item.VersionInfo.ProductVersion} }
}
$data | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $w2Root 'evidence/r2/capabilities.json')
$pairs = @(@('build/three.module.js','three.module.js'),@('build/three.core.js','three.core.js'),@('examples/jsm/loaders/GLTFLoader.js','loaders/GLTFLoader.js'),@('examples/jsm/utils/BufferGeometryUtils.js','utils/BufferGeometryUtils.js'),@('LICENSE','THREE-LICENSE.txt'))
$vendor=@()
foreach($pair in $pairs){
    $source = Join-Path $w2Scratch ('node_modules/three/' + $pair[0])
    $dest = Join-Path $w2Root ('playback/vendor/' + $pair[1])
    $a=(Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash
    $b=(Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash
    $vendor+=@{file=$pair[1];sourceSha256=$a;deliverySha256=$b;status= $(if($a -eq $b){'PASS'}else{'FAIL'})}
}
$vendor | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $w2Root 'evidence/r2/vendor-verification.json')
if($vendor.status -contains 'FAIL'){throw 'Vendored Three.js differs from pinned package'}
Write-Output ($data | ConvertTo-Json -Depth 4)
Write-Output 'Vendor byte comparison: PASS'
