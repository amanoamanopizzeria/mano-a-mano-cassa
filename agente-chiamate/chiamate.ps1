# Agente delle chiamate di A Mano A Mano: gira sul PC della cassa accanto al 2Bit e manda alla cassa nuova
# il numero di chi chiama, appena squilla. NON tocca il modem e NON scrive nel 2Bit: legge in sola lettura
# la tabella dove il 2Bit salva già ogni chiamata (PIZ_tabChiamateRicevute, la riga nasce allo squillo,
# entro 1 secondo: verificato sul PC il 28/10/2026) e la manda a /api/telefono/chiamata con TELEFONO_KEY.
# Zero programmi da installare: PowerShell e .NET ci sono già su Windows. Istruzioni in LEGGIMI.md.
#
#   powershell -ExecutionPolicy Bypass -File chiamate.ps1           manda le chiamate man mano che arrivano
#   powershell -ExecutionPolicy Bypass -File chiamate.ps1 -Prova    legge l'ultima chiamata e esce, senza mandare niente
param([switch]$Prova)

$ErrorActionPreference = "Stop"
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$fileConfig = Join-Path $qui "config.json"
if (-not (Test-Path $fileConfig)) { Write-Host "Manca config.json: copia config.esempio.json in config.json."; exit 1 }
$config = Get-Content $fileConfig -Raw | ConvertFrom-Json
$server = ($config.server, "https://mano-a-mano-cassa.vercel.app" | Where-Object { $_ } | Select-Object -First 1).TrimEnd("/")
$ogni = [Math]::Max(1000, [int]($config.ogniMillisecondi, 1500 | Where-Object { $_ } | Select-Object -First 1))
# la stringa di connessione sta solo in config.json sul PC: l'utente di sola lettura, mai «sa»
$connessione = $config.connessione
if (-not $connessione) { Write-Host "Manca «connessione» in config.json."; exit 1 }
$fileChiave = Join-Path $qui "chiave.txt"
$chiave = if ($env:TELEFONO_KEY) { $env:TELEFONO_KEY } elseif (Test-Path $fileChiave) { (Get-Content $fileChiave -Raw).Trim() } else { "" }
if (-not $chiave -and -not $Prova) { Write-Host "Manca la chiave: variabile TELEFONO_KEY o file chiave.txt accanto all'agente."; exit 1 }

function Log($testo) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $testo) }

function Leggi($sql, $ultimo) {
  $cn = New-Object System.Data.SqlClient.SqlConnection $connessione
  try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = $sql
    $cmd.CommandTimeout = 5
    [void]$cmd.Parameters.AddWithValue("@ultimo", [int]$ultimo)
    $tabella = New-Object System.Data.DataTable
    $tabella.Load($cmd.ExecuteReader())
    return ,$tabella
  } finally { $cn.Close() }
}

# si parte dall'ultima chiamata già salvata: lo storico non si rimanda
$t = Leggi "SELECT ISNULL(MAX(id), 0) AS ultimo, COUNT(*) AS quante FROM dbo.PIZ_tabChiamateRicevute WHERE id > @ultimo" 0
$ultimo = [int]$t.Rows[0].ultimo
Log ("Collegato al 2Bit in sola lettura: {0} chiamate salvate, ultima n. {1}." -f $t.Rows[0].quante, $ultimo)
if ($Prova) { Log "Prova finita: niente è stato mandato."; exit 0 }
Log ("Mando le chiamate nuove a {0} ogni {1} ms. Ctrl+C per fermare." -f $server, $ogni)

$giuSegnalato = $false
while ($true) {
  try {
    $nuove = Leggi "SELECT TOP 20 id, Ora, telefono FROM dbo.PIZ_tabChiamateRicevute WHERE id > @ultimo ORDER BY id" $ultimo
    foreach ($r in $nuove.Rows) {
      $numero = ([string]$r.telefono).Trim()
      $vecchia = ($r.Ora -isnot [System.DBNull]) -and (((Get-Date) - [datetime]$r.Ora).TotalMinutes -gt 2)
      # una chiamata di più di 2 minuti fa (agente rimasto spento) non apre più la scheda
      if ($numero -and -not $vecchia) {
        $corpo = @{ numero = $numero } | ConvertTo-Json -Compress
        Invoke-RestMethod -Method Post -Uri "$server/api/telefono/chiamata" -Headers @{ "x-api-key" = $chiave } -ContentType "application/json" -Body $corpo -TimeoutSec 8 | Out-Null
        Log ("Chiamata n. {0} mandata alla cassa." -f $r.id)
      }
      $ultimo = [int]$r.id
    }
    if ($giuSegnalato) { Log "Di nuovo collegato."; $giuSegnalato = $false }
  } catch {
    # il numero di telefono non si scrive nel registro: solo l'errore, una volta
    if (-not $giuSegnalato) { Log ("Problema: {0}. Riprovo da solo." -f $_.Exception.Message); $giuSegnalato = $true }
  }
  Start-Sleep -Milliseconds $ogni
}
