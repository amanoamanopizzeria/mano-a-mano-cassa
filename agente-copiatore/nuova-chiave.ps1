# Crea la chiave del PC per il copiatore e l'agente delle chiamate e la salva in chiave.txt, SOLO su questo PC.
# Stampa soltanto la sua impronta SHA-256: è quella che va nel database (impostazione_riservata
# «agente_pc_key_sha256»). La chiave vera non va mai in chat, su GitHub o su Vercel.
#   powershell -ExecutionPolicy Bypass -File nuova-chiave.ps1
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$file = Join-Path $qui "chiave.txt"
if (Test-Path $file) { Write-Host "chiave.txt c'è già: per rifarla, prima spostala altrove."; exit 1 }
$byte = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($byte)
$chiave = -join ($byte | ForEach-Object { $_.ToString("x2") })
Set-Content -Path $file -Value $chiave -NoNewline -Encoding ascii
$sha = [System.Security.Cryptography.SHA256]::Create()
$impronta = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($chiave)) | ForEach-Object { $_.ToString("x2") })
Write-Host "Chiave salvata in chiave.txt (non mostrarla a nessuno)."
Write-Host "Impronta da mettere nel database: $impronta"
