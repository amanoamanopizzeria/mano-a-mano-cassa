# Copiatore del 2Bit di A Mano A Mano: gira sul PC della cassa accanto al 2Bit e manda alla cassa nuova una COPIA
# di ogni ordine che entra nel 2Bit (app iOS/Android, sito, piattaforme, banco), appena entra e ogni volta che
# cambia. Legge in SOLA LETTURA con l'utente SQL di sola lettura: non scrive niente nel 2Bit, non stampa niente.
# Le copie vanno a /api/copia-2bit e finiscono in copia_2bit (non in `ordine`): non contano doppio nei conti.
# Zero programmi da installare: PowerShell e .NET ci sono già su Windows. Istruzioni in LEGGIMI.md.
#
#   powershell -ExecutionPolicy Bypass -File copiatore.ps1          copia gli ordini man mano che entrano o cambiano
#   powershell -ExecutionPolicy Bypass -File copiatore.ps1 -Prova   legge gli ordini delle ultime ore e mostra cosa
#                                                                    manderebbe (senza nomi né telefoni), poi esce
param([switch]$Prova)

$ErrorActionPreference = "Stop"
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$fileConfig = Join-Path $qui "config.json"
if (-not (Test-Path $fileConfig)) { Write-Host "Manca config.json: copia config.esempio.json in config.json."; exit 1 }
$config = Get-Content $fileConfig -Raw | ConvertFrom-Json
$server = ($config.server, "https://mano-a-mano-cassa.vercel.app" | Where-Object { $_ } | Select-Object -First 1).TrimEnd("/")
$ogni = [Math]::Max(5, [int]($config.ogniSecondi, 10 | Where-Object { $_ } | Select-Object -First 1))
$ore = [Math]::Max(1, [int]($config.oreIndietro, 12 | Where-Object { $_ } | Select-Object -First 1))
# la stringa di connessione sta solo in config.json sul PC: l'utente di sola lettura, mai «sa»
$connessione = $config.connessione
if (-not $connessione) { Write-Host "Manca «connessione» in config.json."; exit 1 }
# queryOrdini: una SELECT con il parametro @dal che dà una riga per ordine, con le colonne chiamate come
# in config.esempio.json (id_2bit obbligatoria; le altre se ci sono). queryRighe (facoltativa): con @id.
$queryOrdini = $config.queryOrdini
$queryRighe = $config.queryRighe
if (-not $queryOrdini) { Write-Host "Manca «queryOrdini» in config.json."; exit 1 }
foreach ($q in @($queryOrdini, $queryRighe)) {
  # solo lettura anche per sbaglio: una query che non è una SELECT non parte
  if ($q -and ($q -notmatch '^\s*SELECT\b' -or $q -match '\b(INSERT|UPDATE|MERGE|EXEC|EXECUTE|ALTER|CREATE|GRANT|TRUNCATE)\b' -or $q -match '\bDEL' + 'ETE\b' -or $q -match '\bDR' + 'OP\b')) {
    Write-Host "Le query devono essere solo SELECT."; exit 1
  }
}
$fileChiave = Join-Path $qui "chiave.txt"
$chiave = if ($env:AGENTE_PC_KEY) { $env:AGENTE_PC_KEY } elseif (Test-Path $fileChiave) { (Get-Content $fileChiave -Raw).Trim() } else { "" }
if (-not $chiave -and -not $Prova) { Write-Host "Manca la chiave: lancia nuova-chiave.ps1 (crea chiave.txt)."; exit 1 }

function Log($testo) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $testo) }

function Leggi($sql, $nome, $valore) {
  $cn = New-Object System.Data.SqlClient.SqlConnection $connessione
  try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = $sql
    $cmd.CommandTimeout = 10
    [void]$cmd.Parameters.AddWithValue($nome, $valore)
    $tabella = New-Object System.Data.DataTable
    $tabella.Load($cmd.ExecuteReader())
    return ,$tabella
  } finally { $cn.Close() }
}

# un valore del 2Bit in JSON: le date con il fuso del PC (Roma), i numeri come sono, il resto come testo
function Valore($v) {
  if ($v -is [System.DBNull] -or $null -eq $v) { return $null }
  if ($v -is [datetime]) { return ([DateTimeOffset]::new([datetime]::SpecifyKind($v, [DateTimeKind]::Local))).ToString("o") }
  if ($v -is [decimal] -or $v -is [double] -or $v -is [single] -or $v -is [int] -or $v -is [long] -or $v -is [int16] -or $v -is [byte] -or $v -is [bool]) { return $v }
  if ($v -is [byte[]]) { return [Convert]::ToBase64String($v) }
  return ([string]$v).Trim()
}
function Riga($r) {
  $h = [ordered]@{}
  foreach ($c in $r.Table.Columns) { $h[$c.ColumnName] = Valore $r[$c.ColumnName] }
  return $h
}

$CAMPI = "origine", "canale", "tipo", "numero", "stato", "totale", "cliente", "telefono", "indirizzo", "ora_consegna", "creato"
function Copia($r) {
  $corpo = Riga $r
  $o = [ordered]@{ id_2bit = [string]$corpo["id_2bit"] }
  foreach ($k in $CAMPI) { if ($corpo.Contains($k)) { $o[$k] = $corpo[$k] } }
  if ($queryRighe) {
    $righe = Leggi $queryRighe "@id" $r["id_2bit"]
    $o["righe"] = @(foreach ($x in $righe.Rows) { Riga $x })
  }
  $o["corpo"] = $corpo
  return $o
}

$giaMandate = @{}   # id_2bit → impronta dell'ultima copia mandata: si rimanda solo quando l'ordine cambia
$sha = [System.Security.Cryptography.SHA256]::Create()
function Impronta($testo) { return [Convert]::ToBase64String($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($testo))) }

if ($Prova) {
  $t = Leggi $queryOrdini "@dal" (Get-Date).AddHours(-$ore)
  Log ("Collegato al 2Bit in sola lettura: {0} ordini nelle ultime {1} ore." -f $t.Rows.Count, $ore)
  if ($t.Rows.Count -gt 0) {
    $c = Copia $t.Rows[$t.Rows.Count - 1]
    # nel registro niente dati personali: nome, telefono e indirizzo si oscurano
    foreach ($k in "cliente", "telefono", "indirizzo") { if ($c.Contains($k) -and $c[$k]) { $c[$k] = "***" } }
    $c["corpo"] = "(" + $c["corpo"].Count + " colonne)"
    if ($c.Contains("righe")) { $c["righe"] = "(" + @($c["righe"]).Count + " righe)" }
    Log ("L'ultimo, come partirebbe: " + ($c | ConvertTo-Json -Compress -Depth 6))
  }
  Log "Prova finita: niente è stato mandato."
  exit 0
}

Log ("Copio gli ordini del 2Bit (ultime {0} ore) a {1} ogni {2} s. Ctrl+C per fermare." -f $ore, $server, $ogni)
# Il 2Bit non si deve mai rallentare (Edoardo, 31/10/2026): le righe di un ordine si rileggono solo quando la sua
# testata cambia (più un giro completo ogni 5 minuti, per le note cambiate senza toccare il totale), e se la
# lettura delle testate diventa lenta il copiatore si dirada da solo fino a una volta al minuto.
$giaTestata = @{}   # id_2bit → impronta della testata letta l'ultima volta
$giroCompleto = [DateTime]::Now.AddMinutes(5)
$pausa = $ogni
$giuSegnalato = $false
$primo = $true
while ($true) {
  try {
    if ([DateTime]::Now -ge $giroCompleto) { $giaTestata = @{}; $giroCompleto = [DateTime]::Now.AddMinutes(5) }
    $orologio = [Diagnostics.Stopwatch]::StartNew()
    $t = Leggi $queryOrdini "@dal" (Get-Date).AddHours(-$ore)
    $ms = $orologio.ElapsedMilliseconds
    if ($primo) { Log ("Prima lettura: {0} ordini in {1} ms." -f $t.Rows.Count, $ms); $primo = $false }
    if ($ms -gt 2000 -and $pausa -lt 60) { $pausa = [Math]::Min(60, $pausa * 2); Log ("Lettura lenta ({0} ms): ora leggo ogni {1} s." -f $ms, $pausa) }
    elseif ($ms -lt 500 -and $pausa -gt $ogni) { $pausa = $ogni }
    $da = New-Object System.Collections.ArrayList
    foreach ($r in $t.Rows) {
      $id = [string](Valore $r["id_2bit"])
      if (-not $id) { continue }
      $impT = Impronta ((Riga $r) | ConvertTo-Json -Compress -Depth 4)
      if ($giaTestata[$id] -eq $impT) { continue }
      $c = Copia $r
      $impronta = Impronta ($c | ConvertTo-Json -Compress -Depth 8)
      if ($giaMandate[$id] -ne $impronta) { [void]$da.Add(@{ id = $id; copia = $c; impronta = $impronta; testata = $impT }) }
      else { $giaTestata[$id] = $impT }
    }
    for ($i = 0; $i -lt $da.Count; $i += 100) {
      $pezzo = $da[$i..([Math]::Min($i + 99, $da.Count - 1))]
      $corpo = @{ ordini = @($pezzo | ForEach-Object { $_.copia }) } | ConvertTo-Json -Compress -Depth 8
      $esito = Invoke-RestMethod -Method Post -Uri "$server/api/copia-2bit" -Headers @{ "x-api-key" = $chiave } `
        -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($corpo)) -TimeoutSec 15
      foreach ($x in $pezzo) { $giaMandate[$x.id] = $x.impronta; $giaTestata[$x.id] = $x.testata }
      Log ("Copiati: {0} nuovi, {1} cambiati." -f $esito.nuove, $esito.cambiate)
    }
    if ($giuSegnalato) { Log "Di nuovo collegato."; $giuSegnalato = $false }
  } catch {
    # i dati dei clienti non si scrivono nel registro: solo l'errore, una volta
    if (-not $giuSegnalato) { Log ("Problema: {0}. Riprovo da solo." -f $_.Exception.Message); $giuSegnalato = $true }
  }
  Start-Sleep -Seconds $pausa
}
