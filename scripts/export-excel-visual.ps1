param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

function Release-ComObject {
  param([object]$Object)

  if ($null -ne $Object -and [System.Runtime.InteropServices.Marshal]::IsComObject($Object)) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($Object)
  }
}

$excel = $null
$workbook = $null
$worksheet = $null
$chartObjects = $null
$chartObject = $null
$chartSheet = $null
$usedRange = $null
$tempChartObject = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false

  $workbook = $excel.Workbooks.Open($InputPath, 0, $true)
  $exported = $false

  foreach ($sheet in $workbook.Worksheets) {
    $chartObjects = $sheet.ChartObjects()
    if ($chartObjects.Count -gt 0) {
      $chartObject = $chartObjects.Item(1)
      [void]$chartObject.Chart.Export($OutputPath, 'PNG')
      $exported = $true
      Release-ComObject $chartObject
      Release-ComObject $chartObjects
      Release-ComObject $sheet
      break
    }

    Release-ComObject $chartObjects
    Release-ComObject $sheet
  }

  if (-not $exported -and $workbook.Charts.Count -gt 0) {
    $chartSheet = $workbook.Charts.Item(1)
    [void]$chartSheet.Export($OutputPath, 'PNG')
    $exported = $true
    Release-ComObject $chartSheet
  }

  if (-not $exported) {
    $worksheet = $workbook.Worksheets.Item(1)
    $usedRange = $worksheet.UsedRange

    $width = [Math]::Max([int][Math]::Ceiling($usedRange.Width), 320)
    $height = [Math]::Max([int][Math]::Ceiling($usedRange.Height), 180)

    [void]$usedRange.CopyPicture(1, 2)
    $chartObjects = $worksheet.ChartObjects()
    $tempChartObject = $chartObjects.Add(12, 12, $width, $height)
    [void]$tempChartObject.Chart.Paste()
    [void]$tempChartObject.Chart.Export($OutputPath, 'PNG')
    $tempChartObject.Delete()
    $exported = $true
  }

  if (-not $exported -or -not (Test-Path -LiteralPath $OutputPath)) {
    throw 'Excel could not export workbook visual.'
  }
}
finally {
  if ($null -ne $workbook) {
    try { $workbook.Close($false) } catch {}
  }

  if ($null -ne $excel) {
    try { $excel.Quit() } catch {}
  }

  Release-ComObject $tempChartObject
  Release-ComObject $usedRange
  Release-ComObject $chartObject
  Release-ComObject $chartObjects
  Release-ComObject $chartSheet
  Release-ComObject $worksheet
  Release-ComObject $workbook
  Release-ComObject $excel

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
