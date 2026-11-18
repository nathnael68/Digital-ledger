# ==============================================================================
# Delgone Digital Sales Ledger - Automated Database Backup Script (PowerShell)
# Delgone Trading PLC - Addis Ababa, Ethiopia
# ==============================================================================

[CmdletBinding()]
param(
    [string]$BackupDir = "backups",
    [string]$ContainerName = "delgone_db",
    [string]$PostgresUser = "delgone_user",
    [string]$PostgresDb = "delgone_ledger"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DailyDir = Join-Path $BackupDir "daily"
$WeeklyDir = Join-Path $BackupDir "weekly"
$MonthlyDir = Join-Path $BackupDir "monthly"

New-Item -ItemType Directory -Force -Path $DailyDir, $WeeklyDir, $MonthlyDir | Out-Null

$BackupFilename = "delgone_ledger_backup_${Timestamp}.sql"
$TargetFile = Join-Path $DailyDir $BackupFilename

Write-Host "[INFO] Initiating database backup for '${PostgresDb}'..." -ForegroundColor Cyan

# Check for Docker container
$dockerFound = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerFound) {
    $runningContainers = docker ps --format "{{.Names}}"
    if ($runningContainers -contains $ContainerName) {
        Write-Host "[INFO] Dumping database from Docker container '${ContainerName}'..." -ForegroundColor Green
        docker exec $ContainerName pg_dump -U $PostgresUser -d $PostgresDb --no-owner --clean --if-exists > $TargetFile
    } else {
        Write-Host "[WARN] Container '${ContainerName}' not found or not running." -ForegroundColor Yellow
    }
}

if (-not (Test-Path $TargetFile) -or (Get-Item $TargetFile).Length -eq 0) {
    # Try pg_dump CLI if installed
    $pgDumpFound = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($pgDumpFound) {
        Write-Host "[INFO] Dumping database via local pg_dump..." -ForegroundColor Green
        & pg_dump -U $PostgresUser -d $PostgresDb --no-owner --clean --if-exists -f $TargetFile
    } else {
        Write-Error "[ERROR] Failed to execute backup. Ensure Docker or PostgreSQL client is running."
        exit 1
    }
}

$fileSize = (Get-Item $TargetFile).Length
Write-Host "[INFO] Backup written to $TargetFile ($fileSize bytes)" -ForegroundColor Green

# Compute SHA256
$hash = (Get-FileHash -Algorithm SHA256 -Path $TargetFile).Hash
$checksumFile = "$TargetFile.sha256"
"$hash  $BackupFilename" | Out-File -FilePath $checksumFile -Encoding ascii
Write-Host "[INFO] Checksum generated: $checksumFile" -ForegroundColor Gray

# Retention checks
$dayOfWeek = (Get-Date).DayOfWeek
if ($dayOfWeek -eq [System.DayOfWeek]::Sunday) {
    Copy-Item $TargetFile -Destination $WeeklyDir
    Copy-Item $checksumFile -Destination $WeeklyDir
    Write-Host "[INFO] Copied to weekly retention tier." -ForegroundColor Cyan
}

if ((Get-Date).Day -eq 1) {
    Copy-Item $TargetFile -Destination $MonthlyDir
    Copy-Item $checksumFile -Destination $MonthlyDir
    Write-Host "[INFO] Copied to monthly retention tier." -ForegroundColor Cyan
}

# Cleanup older backups
Get-ChildItem -Path $DailyDir -Filter "*.sql*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
Get-ChildItem -Path $WeeklyDir -Filter "*.sql*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
Get-ChildItem -Path $MonthlyDir -Filter "*.sql*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-180) } | Remove-Item -Force

Write-Host "[SUCCESS] Backup completed successfully." -ForegroundColor Green
