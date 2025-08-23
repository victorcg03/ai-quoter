param(
    [Parameter(Mandatory=$true)]
    [string]$Path,
    
    [Parameter(Mandatory=$false)]
    [string[]]$IgnoreFolders = @('node_modules', '.git', '.vscode', '.astro', 'dist', 'build', 'coverage', '.next', '.nuxt', 'logs', '.log'),
    
    [Parameter(Mandatory=$false)]
    [string[]]$IgnoreFiles = @('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', 'Thumbs.db', '*.log', 'extract-code.ps1')
)

# Verificar que la ruta existe
if (-not (Test-Path $Path)) {
    Write-Error "La ruta '$Path' no existe."
    exit 1
}

# Extensiones de archivos de código comunes
$codeExtensions = @(
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
    '.py', '.rb', '.php', '.java', '.c', '.cpp', '.cs',
    '.go', '.rs', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.sass', '.less',
    '.json', '.xml', '.yaml', '.yml', '.toml',
    '.md', '.txt', '.sh', '.bat', '.ps1',
    '.sql', '.r', '.m', '.pl', '.lua',
    '.dart', '.elm', '.ex', '.exs', '.fs',
    '.clj', '.cljs', '.hs', '.ml', '.nim'
)

# Función para verificar si un archivo debe ser ignorado
function Should-BeIgnored {
    param(
        [System.IO.FileInfo]$File,
        [string[]]$IgnoreFolders,
        [string[]]$IgnoreFiles,
        [string]$BasePath
    )
    
    # Obtener la ruta relativa
    $relativePath = $File.FullName.Substring((Resolve-Path $BasePath).Path.Length)
    if ($relativePath.StartsWith('\')) {
        $relativePath = $relativePath.Substring(1)
    }
    $relativePath = $relativePath -replace '\\', '/'
    
    # Verificar carpetas a ignorar
    foreach ($folder in $IgnoreFolders) {
        if ($relativePath -like "*/$folder/*" -or $relativePath -like "$folder/*" -or $relativePath -eq $folder) {
            return $true
        }
    }
    
    # Verificar archivos a ignorar
    foreach ($pattern in $IgnoreFiles) {
        if ($File.Name -like $pattern) {
            return $true
        }
    }
    
    return $false
}

# Obtener todos los archivos de código recursivamente
$files = Get-ChildItem -Path $Path -Recurse -File | Where-Object {
    $_.Extension -in $codeExtensions -and -not (Should-BeIgnored -File $_ -IgnoreFolders $IgnoreFolders -IgnoreFiles $IgnoreFiles -BasePath $Path)
}

# Si no se encuentran archivos
if ($files.Count -eq 0) {
    Write-Host "No se encontraron archivos de código en la ruta especificada."
    exit 0
}

Write-Host "Encontrados $($files.Count) archivos de código. Extrayendo contenido a 'code.txt'..."
Write-Host "Carpetas ignoradas: $($IgnoreFolders -join ', ')"
Write-Host "Archivos ignorados: $($IgnoreFiles -join ', ')"

# Crear o limpiar el archivo de salida
$outputFile = "code.txt"
"" | Out-File -FilePath $outputFile -Encoding UTF8

foreach ($file in $files) {
    try {
        # Obtener la ruta relativa desde el directorio especificado
        $relativePath = $file.FullName.Substring((Resolve-Path $Path).Path.Length)
        if ($relativePath.StartsWith('\')) {
            $relativePath = $relativePath.Substring(1)
        }
        
        # Convertir separadores de Windows a formato universal
        $relativePath = $relativePath -replace '\\', '/'
        
        # Escribir al archivo
        "//-----------------" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "//$relativePath" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        
        # Leer el contenido del archivo
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        
        # Si el archivo está vacío, escribir mensaje
        if ([string]::IsNullOrWhiteSpace($content)) {
            "(archivo vacío)" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        } else {
            $content | Out-File -FilePath $outputFile -Append -Encoding UTF8 -NoNewline
        }
        
        "" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "//-----------------" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    }
    catch {
        Write-Warning "Error al leer el archivo '$($file.FullName)': $($_.Exception.Message)"
    }
}

Write-Host "Extracción completada. Total de archivos procesados: $($files.Count)"
Write-Host "Resultado guardado en: $outputFile"
