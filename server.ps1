# -------------------------------------------------------------------
# Trustera Consulting - Native PowerShell HTTP Server
# -------------------------------------------------------------------
# Serves the frontend static files on http://localhost:8000 using .NET.

$port = 8000
$basePath = "C:\Users\ksid1\.gemini\antigravity\scratch\trustera-website\frontend"

# Force stop any previous listener on this port
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Error "Could not start server. Port $port might already be in use."
    exit
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host " Trustera Local Dev Server is ACTIVE!" -ForegroundColor Green
Write-Host " Listening on: http://localhost:$port/" -ForegroundColor Cyan
Write-Host " Press Ctrl+C in this terminal to stop the server" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
Write-Host

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { 
            $localPath = "/index.html" 
        }
        
        # Prevent path traversal attacks
        $localPath = $localPath.Replace("..", "")
        $filePath = Join-Path $basePath $localPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content Type Mapping
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".png")) { $response.ContentType = "image/png" }
            elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) { $response.ContentType = "image/jpeg" }
            elseif ($filePath.EndsWith(".svg")) { $response.ContentType = "image/svg+xml" }
            else { $response.ContentType = "application/octet-stream" }
            
            # Add CORS headers
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $statusBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $statusBytes.Length
            $response.OutputStream.Write($statusBytes, 0, $statusBytes.Length)
        }
        $response.Close()
    } catch {
        # Handle connection resets silently
        $response.Close()
    }
}
$listener.Close()
