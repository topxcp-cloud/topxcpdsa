Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\DEVANSHU\.gemini\antigravity\brain\4a872bbc-f90a-4005-aa4f-6e91e938a3ec\.user_uploaded\media_1792528183519_3b302e1c.png"
$img = [System.Drawing.Image]::FromFile($filePath)
$bmp = New-Object System.Drawing.Bitmap($img)
$p0 = $bmp.GetPixel(0, 0)
$pCenter = $bmp.GetPixel(512, 281)
Write-Host "Width:" $bmp.Width "Height:" $bmp.Height
Write-Host "Pixel (0,0) Alpha:" $p0.A "R:" $p0.R "G:" $p0.G "B:" $p0.B
Write-Host "Pixel (512,281) Alpha:" $pCenter.A "R:" $pCenter.R "G:" $pCenter.G "B:" $pCenter.B
$img.Dispose()
$bmp.Dispose()
