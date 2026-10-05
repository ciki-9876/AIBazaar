param([switch]$Download)
$ErrorActionPreference = 'Stop'
$f9Root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$f9Work = Join-Path $f9Root 'work/ai-mail'
$f9Runtime = Join-Path $f9Work 'runtime/llama/llama-server.exe'
$f9Model = Join-Path $f9Work 'models/qwen3-4b-q4.gguf'
if (!(Test-Path -LiteralPath $f9Runtime) -or !(Test-Path -LiteralPath $f9Model)) {
  if (!$Download) { throw 'Runtime/model missing. Rerun with -Download to fetch the local model.' }
  New-Item -ItemType Directory -Path (Join-Path $f9Work 'runtime'),(Join-Path $f9Work 'models') -Force | Out-Null
  $f9Zip = Join-Path $f9Work 'runtime/llama-vulkan.zip'
  if (!(Test-Path -LiteralPath $f9Runtime)) {
    Invoke-WebRequest 'https://github.com/ggml-org/llama.cpp/releases/download/b11381/llama-b11381-bin-win-vulkan-x64.zip' -OutFile $f9Zip
    Expand-Archive -LiteralPath $f9Zip -DestinationPath (Join-Path $f9Work 'runtime/llama') -Force
  }
  if (!(Test-Path -LiteralPath $f9Model)) {
    Invoke-WebRequest 'https://huggingface.co/bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen_Qwen3-4B-Instruct-2507-Q4_K_M.gguf?download=true' -OutFile $f9Model
  }
}
if ((Get-FileHash -LiteralPath $f9Model -Algorithm SHA256).Hash -ne '2FDE00CE69DD4899C70D020845E2638353015BBA0FDF161B3EB965F2BCA4464E') { throw 'Model checksum mismatch; no service started.' }
$f9ConfigFile = Join-Path $f9Work 'runtime.json'
if (Test-Path -LiteralPath $f9ConfigFile) {
  $f9Existing = Get-Content -LiteralPath $f9ConfigFile -Raw | ConvertFrom-Json
  try {
    $f9Health = Invoke-RestMethod 'http://127.0.0.1:4194/health' -Headers @{ Authorization = 'Bearer ' + $f9Existing.key } -TimeoutSec 2
    if ($f9Health.status -eq 'ok') { Write-Output 'Local mail model is already running.'; exit 0 }
  } catch { }
}
$f9KeyBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($f9KeyBytes)
$f9Key = [Convert]::ToHexString($f9KeyBytes).ToLowerInvariant()
$f9KeyFile = Join-Path $f9Work 'api-key.txt'
Set-Content -LiteralPath $f9KeyFile -Value $f9Key -Encoding ascii
$f9Args = @('-m',('"' + $f9Model + '"'),'--host','127.0.0.1','--port','4194','--ctx-size','8192','--parallel','1','--n-gpu-layers','99','--threads','8','--alias','f9-mail-qwen4b','--jinja','--api-key-file',('"' + $f9KeyFile + '"'))
$f9Process = Start-Process -FilePath $f9Runtime -ArgumentList $f9Args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $f9Work 'model.out.log') -RedirectStandardError (Join-Path $f9Work 'model.err.log')
@{ endpoint = 'http://127.0.0.1:4194/v1'; model = 'f9-mail-qwen4b'; key = $f9Key; pid = $f9Process.Id; modelSha256 = '2fde00ce69dd4899c70d020845e2638353015bba0fdf161b3eb965f2bca4464e' } | ConvertTo-Json | Set-Content -LiteralPath $f9ConfigFile
Write-Output ('Local mail model started, pid=' + $f9Process.Id + '. Configuration remains under ignored work/ai-mail.')
