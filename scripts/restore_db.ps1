# ==============================================================================
# Delgone Digital Sales Ledger - Automated Database Restoration Script (PowerShell)
# Delgone Trading PLC - Addis Ababa, Ethiopia
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$ContainerName = "delgone_db",
    [string]$PostgresUser = "delgone_user",
    [string]$PostgresDb = "delgone_ledger",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "[ERROR] Backup file '$BackupFile' does not exist."
    exit 1
}

Write-Host "[INFO] Target database: $PostgresDb" -ForegroundColor Cyan
Write-Host "[INFO] Source backup:   $BackupFile" -ForegroundColor Cyan

# Check SHA256 if available
$checksumFile = "$BackupFile.sha256"
if (Test-Path $checksumFile) {
    Write-Host "[INFO] Verifying SHA256 checksum..." -ForegroundColor Cyan
    $expectedHash = (Get-Content $checksumFile).Split(" ")[0].Trim().ToUpper()
    $actualHash = (Get-FileHash -Algorithm SHA256 -Path $BackupFile).Hash.ToUpper()
    if ($expectedHash -ne $actualHash) {
        Write-Error "[ERROR] Checksum mismatch! Backup file may be corrupted."
        exit 1
    }
    Write-Host "[INFO] Checksum verified successfully." -ForegroundColor Green
}

if (-not $Force) {
    $confirm = Read-Host "WARNING: Restoring will overwrite existing data in '$PostgresDb'. Continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "[ABORTED] Restoration cancelled." -ForegroundColor Yellow
        exit 0
    }
}

$dockerFound = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerFound) {
    $runningContainers = docker ps --format "{{.Names}}"
    if ($runningContainers -contains $ContainerName) {
        Write-Host "[INFO] Restoring via Docker container '${ContainerName}'..." -ForegroundColor Green
        Get-Content $BackupFile | docker exec -i $ContainerName psql -U $PostgresUser -d $PostgresDb
        Write-Host "[SUCCESS] Database restoration complete." -ForegroundColor Green
        exit 0
    }
}

$psqlFound = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlFound) {
    Write-Host "[INFO] Restoring via local psql..." -ForegroundColor Green
    & psql -U $PostgresUser -d $PostgresDb -f $BackupFile
    Write-Host "[SUCCESS] Database restoration complete." -ForegroundColor Green
    exit 0
}

Write-Error "[ERROR] Neither Docker container '${ContainerName}' nor 'psql' utility was found."
exit 1
