# Database Reliability, Backup & Restoration Guide

**Project:** Delgone Digital Sales Ledger  
**Organization:** Delgone Trading PLC — Addis Ababa, Ethiopia  
**Phase:** Phase 6 — Production Readiness, PWA, Deployment & Security  
**Database Engine:** PostgreSQL 16 Alpine  

---

## 1. Overview & Strategy

Financial records at Delgone Trading PLC represent legal sales, VAT declarations, and receivables tracking. Database reliability requires automated scheduled backups, cryptographic integrity validation, multi-tier retention, and routine verification of disaster recovery.

A backup is **never considered valid** until its restoration procedure has been executed and verified against data integrity checks.

---

## 2. Retention Policy

Backups are structured into three distinct retention tiers:

| Tier | Frequency | Schedule (EAT - UTC+3) | Retention Period | Storage Location |
| :--- | :--- | :--- | :--- | :--- |
| **Daily** | Every night | 02:00 EAT | **7 days** | `/var/backups/delgone_ledger/daily/` |
| **Weekly** | Every Sunday | 03:00 EAT | **30 days (4 weeks)** | `/var/backups/delgone_ledger/weekly/` |
| **Monthly** | 1st of each month | 04:00 EAT | **180 days (6 months)** | `/var/backups/delgone_ledger/monthly/` |

---

## 3. Automated Backup Script (`scripts/backup_db.sh`)

The automated shell script dumps the PostgreSQL database, compresses the output using gzip, generates a cryptographic SHA-256 hash, and archives snapshots into weekly and monthly retention folders.

### Execution Workflow
1. Detects whether PostgreSQL is running within Docker container (`delgone_prod_db`) or host environment.
2. Executes `pg_dump --no-owner --clean --if-exists` piped to `gzip`.
3. Verifies dump size exceeds minimum threshold (> 1 KB).
4. Generates SHA256 checksum: `<backup_file>.sql.gz.sha256`.
5. Promotes Sunday backups to `/weekly/` and 1st-of-month backups to `/monthly/`.
6. Prunes obsolete backups exceeding retention age using `find -mtime`.

### Scheduling via Linux Cron
On the production VPS, edit the root crontab:
```bash
sudo crontab -e
```
Add the following line to schedule backups daily at 02:00 AM East Africa Time:
```cron
0 2 * * * /bin/bash /opt/delgone/scripts/backup_db.sh >> /var/log/delgone_backup.log 2>&1
```

---

## 4. Database Restoration Procedure (`scripts/restore_db.sh`)

In the event of hardware failure, catastrophic data corruption, or disaster recovery drills, follow this exact procedure.

### Step-by-Step Recovery:

1. **Locate Target Backup File & Checksum:**
   ```bash
   ls -la /var/backups/delgone_ledger/daily/
   ```

2. **Verify SHA256 Integrity:**
   ```bash
   cd /var/backups/delgone_ledger/daily
   sha256sum -c delgone_ledger_backup_YYYYMMDD_HHMMSS.sql.gz.sha256
   ```

3. **Execute Restoration Script:**
   ```bash
   sudo /bin/bash /opt/delgone/scripts/restore_db.sh \
     /var/backups/delgone_ledger/daily/delgone_ledger_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

4. **Automated Restoration Logic:**
   - Script verifies file existence and validates SHA-256 hash.
   - Prompts for explicit interactive confirmation (`yes`).
   - Terminates all active connections to the target database to eliminate lock contention:
     ```sql
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE datname = 'delgone_ledger' AND pid <> pg_backend_pid();
     ```
   - Pipes uncompressed SQL stream into target database:
     ```bash
     gunzip -c backup.sql.gz | docker exec -i delgone_prod_db psql -U delgone_user -d delgone_ledger
     ```
   - Automatically queries `information_schema.tables` to assert all public tables are restored.

5. **Run Database Migrations (Post-Restore):**
   ```bash
   docker exec -t delgone_prod_backend alembic upgrade head
   ```

6. **Verify Backend Health:**
   ```bash
   curl -s http://localhost:8000/api/health | jq .
   ```

---

## 5. Automated Verification Test Suite

To prove restoration reliability in automated CI/CD pipelines, `backend/tests/test_backup_restore.py` executes a full lifecycle test:
1. Seeds production-like entities: User, Customer, Product, Sale with credit terms, Sale Items, and Cash Payments.
2. Generates an exact SQL dump with SHA-256 checksum.
3. Simulates file corruption and verifies the test detects tampering.
4. Cleanses target environment and restores the schema and records from the dump.
5. Queries restored records and asserts exact equality for:
   - User credentials, roles, and status.
   - Customer balances and identity details.
   - Sale subtotal, VAT amount, grand total, and payment status.
   - Line items and payment allocations.

**Test Execution:**
```bash
pytest backend/tests/test_backup_restore.py
# Output: 1 passed in 0.44s
```

---

## 6. Secure Offsite Storage Recommendation

For enterprise production deployment:
- **Cloud Object Storage:** Configure an automated nightly rsync or `rclone` job copying `/var/backups/delgone_ledger` to an S3-compatible encrypted bucket (AWS S3, Cloudflare R2, or Backblaze B2) with Object Lock enabled for ransomware protection.
- **Access Restrictions:** Backup directory permissions must be restricted to `chmod 700 /var/backups/delgone_ledger`.
