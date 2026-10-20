Add-Type -AssemblyName System.Drawing

function Generate-TopxIcon([int]$size, [string]$outPath, [bool]$forDark = $false) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $circle = New-Object System.Drawing.Drawing2D.GraphicsPath
    $circle.AddEllipse(($size * 0.02), ($size * 0.02), ($size * 0.96), ($size * 0.96))
    $backgroundBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($backgroundBrush, ($size * 0.02), ($size * 0.02), ($size * 0.96), ($size * 0.96))
    $g.SetClip($circle)
    $circle.Dispose()
    $backgroundBrush.Dispose()

    # Coordinates in original space (viewBox: 340, 150, 910, 500)
    $srcX = 340.0
    $srcY = 150.0
    $srcW = 910.0
    $srcH = 500.0

    # Fit the logo inside the circular frame with the same proportions as the reference.
    $targetW = $size * 0.95
    $targetH = $targetW * ($srcH / $srcW)
    $offsetX = ($size - $targetW) / 2.0
    $offsetY = ($size - $targetH) / 2.0

    function Map-Pts([string]$ptStr) {
        $raw = $ptStr -split '\s+' | Where-Object { $_ -ne '' }
        $pts = New-Object "System.Drawing.PointF[]" $raw.Count
        for ($i = 0; $i -lt $raw.Count; $i++) {
            $coords = $raw[$i] -split ','
            $x = [double]$coords[0]
            $y = [double]$coords[1]
            $nx = $offsetX + (($x - $srcX) / $srcW) * $targetW
            $ny = $offsetY + (($y - $srcY) / $srcH) * $targetH
            $pts[$i] = New-Object System.Drawing.PointF([float]$nx, [float]$ny)
        }
        return ,$pts
    }

    # Color palette matching the uploaded image.
    $chevColor = [System.Drawing.Color]::FromArgb(255, 36, 36, 36)
    $brushChevron = New-Object System.Drawing.SolidBrush($chevColor)
    $brushOrange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 77, 46))
    $brushDarkGrey = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 85, 85, 85))
    # Peach / Salmon Shard #FFA07A
    $brushPeach = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 147, 105))

    # 1. Left Chevron
    $g.FillPolygon($brushChevron, (Map-Pts "538,208 587,254 449,393 579,527 529,577 354,395"))
    # 2. Right Chevron
    $g.FillPolygon($brushChevron, (Map-Pts "1059,208 1239,392 1059,575 1011,527 1143,391 1009,254"))
    # 3. Center Diagonal Slash
    $g.FillPolygon($brushOrange, (Map-Pts "988,159 1027,159 547,640 508,640"))
    # 4. Top-Left Dark Grey Shard
    $g.FillPolygon($brushDarkGrey, (Map-Pts "625,255 717,255 796,334 745,383 678,313"))
    # 5. Middle-Left Orange Shard
    $g.FillPolygon($brushOrange, (Map-Pts "625,367 678,313 745,383 694,438"))
    # 6. Middle-Right Orange Shard
    $g.FillPolygon($brushOrange, (Map-Pts "942,334 989,382 897,478 850,430"))
    # 7. Bottom-Right Dark Grey Shard
    $g.FillPolygon($brushDarkGrey, (Map-Pts "770,433 813,390 850,430 897,478 959,544 871,544"))
    # 8. Center Peach Diamond
    $g.FillPolygon($brushPeach, (Map-Pts "832,369 870,410 850,430 813,390"))

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $brushChevron.Dispose()
    $brushOrange.Dispose()
    $brushDarkGrey.Dispose()
    $brushPeach.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($size x $size)"
}

$baseDir = "D:\aa shit here we go again\AM-01-09---21-10-26"
$iconsDir = Join-Path $baseDir "public\icons"
if (!(Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir -Force }

Generate-TopxIcon 512 (Join-Path $iconsDir "icon-512.png")
Generate-TopxIcon 512 (Join-Path $iconsDir "icon-maskable-512.png")
Generate-TopxIcon 192 (Join-Path $iconsDir "icon-192.png")
Generate-TopxIcon 192 (Join-Path $iconsDir "icon-maskable-192.png")
Generate-TopxIcon 180 (Join-Path $iconsDir "apple-touch-icon.png")
Generate-TopxIcon 32 (Join-Path $iconsDir "favicon-32x32.png")
Generate-TopxIcon 16 (Join-Path $iconsDir "favicon-16x16.png")

# Also copy 32x32 or 48x48 to favicon.ico format
function Convert-PngToIco([string]$pngPath, [string]$icoPath) {
    $pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
    $fs = [System.IO.File]::Create($icoPath)
    $bw = New-Object System.IO.BinaryWriter($fs)
    # ICONDIR header
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type: 1 = ICO
    $bw.Write([uint16]1) # Number of images
    # ICONDIRENTRY
    $bw.Write([byte]32)  # Width
    $bw.Write([byte]32)  # Height
    $bw.Write([byte]0)   # Color count
    $bw.Write([byte]0)   # Reserved
    $bw.Write([uint16]1) # Color planes
    $bw.Write([uint16]32)# Bits per pixel
    $bw.Write([uint32]$pngBytes.Length) # Image size
    $bw.Write([uint32]22)# Offset (6 + 16 = 22)
    # Image data (PNG format is valid in modern ICO files)
    $bw.Write($pngBytes)
    $bw.Flush()
    $fs.Close()
    Write-Host "Created ICO: $icoPath"
}

$png32 = Join-Path $iconsDir "favicon-32x32.png"
Convert-PngToIco $png32 (Join-Path $baseDir "public\favicon.ico")
Convert-PngToIco $png32 (Join-Path $baseDir "app\favicon.ico")
