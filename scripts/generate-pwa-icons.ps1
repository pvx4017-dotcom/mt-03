Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\logo\logo.png" | Resolve-Path
$outDir = Join-Path $PSScriptRoot "..\public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = [System.Drawing.Image]::FromFile($srcPath)
Write-Output ("source=" + $src.Width + "x" + $src.Height)

function Save-PwaIcon([int]$size, [string]$fileName, [int]$padding) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $inner = $size - (2 * $padding)
  $scale = [Math]::Min($inner / $src.Width, $inner / $src.Height)
  $w = [int][Math]::Round($src.Width * $scale)
  $h = [int][Math]::Round($src.Height * $scale)
  $x = [int][Math]::Round(($size - $w) / 2)
  $y = [int][Math]::Round(($size - $h) / 2)
  $g.DrawImage($src, $x, $y, $w, $h)
  $dest = Join-Path $outDir $fileName
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output ("wrote " + $fileName)
}

Save-PwaIcon 180 "apple-touch-icon.png" 8
Save-PwaIcon 192 "icon-192.png" 10
Save-PwaIcon 512 "icon-512.png" 24
Save-PwaIcon 512 "icon-512-maskable.png" 72

$src.Dispose()
