# Manda un file di byte ESC/POS, così com'è, a una stampante installata in Windows (per esempio la ASP,
# TM-T88V via USB). Usa lo spooler di Windows in modo RAW: il driver non ridisegna niente, quindi la carta
# esce uguale a quella della stampante in rete. Lo chiama agente.mjs; da solo serve per una prova:
#   powershell -NoProfile -ExecutionPolicy Bypass -File stampa-windows.ps1 -Stampante "ASP" -File prova.bin
# Il nome è quello di Impostazioni → Stampanti (o: Get-Printer | Select Name). Non cambia nessuna impostazione.
param([Parameter(Mandatory = $true)][string]$Stampante, [Parameter(Mandatory = $true)][string]$File)
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class StampaGrezza {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool OpenPrinter(string nome, out IntPtr h, IntPtr def);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern int StartDocPrinter(IntPtr h, int livello, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool WritePrinter(IntPtr h, byte[] dati, int n, out int scritti);
  public static void Manda(string nome, byte[] dati) {
    IntPtr h;
    if (!OpenPrinter(nome, out h, IntPtr.Zero)) throw new Exception("stampante non trovata: " + nome);
    try {
      var di = new DOCINFO { pDocName = "Comanda A Mano A Mano", pDataType = "RAW" };
      if (StartDocPrinter(h, 1, di) == 0) throw new Exception("StartDocPrinter " + Marshal.GetLastWin32Error());
      try {
        StartPagePrinter(h);
        int scritti;
        if (!WritePrinter(h, dati, dati.Length, out scritti) || scritti != dati.Length) throw new Exception("WritePrinter " + Marshal.GetLastWin32Error());
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
[StampaGrezza]::Manda($Stampante, [System.IO.File]::ReadAllBytes($File))
