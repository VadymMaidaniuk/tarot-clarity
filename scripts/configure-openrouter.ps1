$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\.env.local"
$secureKey = Read-Host "Вставте OpenRouter API key" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ([string]::IsNullOrWhiteSpace($key)) {
        throw "Ключ не може бути порожнім."
    }

    $content = if (Test-Path $envPath) {
        Get-Content -LiteralPath $envPath -Raw
    } else {
        ""
    }

    if ($content -match "(?m)^OPENROUTER_API_KEY=") {
        $content = $content -replace "(?m)^OPENROUTER_API_KEY=.*$", "OPENROUTER_API_KEY=$key"
    } else {
        $content = $content.TrimEnd() + "`r`nOPENROUTER_API_KEY=$key`r`n"
    }

    Set-Content -LiteralPath $envPath -Value $content -Encoding utf8
    Write-Host "OpenRouter налаштовано. Перезапустіть npm run dev." -ForegroundColor Green
}
finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    $key = $null
}
