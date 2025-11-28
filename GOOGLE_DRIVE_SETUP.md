# Setup Google Drive Integration

Dokumentasi untuk mengkonfigurasi Google Drive agar file yang dikirim ke tenant otomatis tersimpan di Google Drive.

## Prasyarat

1. Akun Google dengan akses ke Google Cloud Console
2. Node.js dan npm terinstall

## Langkah-langkah Setup

### 1. Buat Service Account di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Aktifkan **Google Drive API**:
   - Pergi ke "APIs & Services" > "Library"
   - Cari "Google Drive API"
   - Klik "Enable"

### 2. Buat Service Account

1. Pergi ke "APIs & Services" > "Credentials"
2. Klik "Create Credentials" > "Service Account"
3. Isi nama service account (contoh: "wazium-drive-uploader")
4. Klik "Create and Continue"
5. Pilih role "Editor" (atau role yang sesuai)
6. Klik "Done"

### 3. Download Credentials JSON

1. Klik service account yang baru dibuat
2. Pergi ke tab "Keys"
3. Klik "Add Key" > "Create new key"
4. Pilih format "JSON"
5. Klik "Create" - file JSON akan terdownload
6. Simpan file ini dengan nama `google-drive-credentials.json` di folder `credentials/` di root project

### 4. Buat Folder di Google Drive

1. Buka Google Drive
2. Buat folder baru (atau gunakan folder yang sudah ada) untuk menyimpan file invoice
3. Klik kanan pada folder > "Share"
4. Tambahkan email service account (dari credentials JSON, field `client_email`)
5. Berikan akses "Editor"
6. Copy **Folder ID** dari URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - Contoh: Jika URL adalah `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`, maka Folder ID adalah `1a2b3c4d5e6f7g8h9i0j`

### 5. Konfigurasi Environment Variables

Tambahkan ke file `.env`:

```env
GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
```

**Contoh:**
```env
GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-credentials.json
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

### 6. Install Dependencies

```bash
npm install
```

Atau jika hanya ingin install googleapis:
```bash
npm install googleapis
```

### 7. Struktur Folder

Pastikan struktur folder seperti ini:

```
WaziumBot/
├── credentials/
│   └── google-drive-credentials.json
├── service/
│   ├── googleDrive.js
│   └── wazium.js
└── ...
```

### 8. Restart Server

Setelah konfigurasi, restart server:

```bash
npm start
```

## Verifikasi

Setelah server berjalan, cek console log. Jika berhasil, akan muncul:

```
✅ Google Drive initialized successfully
```

Jika ada error, akan muncul:

```
⚠️ Google Drive credentials not configured. File upload to Drive will be skipped.
```

## Cara Kerja

1. Saat file dikirim ke tenant melalui WhatsApp, file akan otomatis diupload ke Google Drive
2. File disimpan di folder yang sudah dikonfigurasi
3. Link Google Drive disimpan di data invoice
4. Link dapat dilihat di tab "Daftar Invoice"

## Catatan Penting

- **Keamanan**: Jangan commit file credentials ke Git. Tambahkan `credentials/` ke `.gitignore`
- **Storage**: Google Drive memiliki batas storage. Pastikan akun Google Drive memiliki cukup space
- **Permissions**: Service account harus memiliki akses Editor ke folder target
- **Optional**: Jika Google Drive tidak dikonfigurasi, sistem tetap berfungsi normal, hanya file tidak akan diupload ke Drive

## Troubleshooting

### Error: "File upload to Drive will be skipped"
- Pastikan `GOOGLE_DRIVE_CREDENTIALS_PATH` dan `GOOGLE_DRIVE_FOLDER_ID` sudah diisi di `.env`
- Pastikan file credentials JSON ada di path yang benar
- Pastikan service account memiliki akses ke folder

### Error: "Permission denied"
- Pastikan service account email sudah ditambahkan sebagai Editor di folder Google Drive
- Cek email service account di file credentials JSON (field `client_email`)

### Error: "API not enabled"
- Pastikan Google Drive API sudah diaktifkan di Google Cloud Console
- Tunggu beberapa menit setelah enable API

## Menjalankan dengan Docker

1. Siapkan file `.env` di root proyek berisi (contoh):
   ```env
   PORT=3000
   GOOGLE_DRIVE_CREDENTIALS_PATH=/app/credentials/google-drive-credentials.json
   GOOGLE_DRIVE_FOLDER_ID=your_folder_id
   # Opsional untuk DWD
   # GOOGLE_IMPERSONATE_EMAIL=user@your-domain.com
   ```

2. Simpan credentials JSON di `./credentials/google-drive-credentials.json` (host)

3. Jalankan:
   ```bash
   docker compose up -d --build
   ```

4. Aplikasi akan tersedia di `http://localhost:3000`

Catatan: docker-compose sudah memount folder `credentials/` ke `/app/credentials` sebagai read-only.

## (Opsional) Domain-Wide Delegation (DWD)

Gunakan DWD jika Anda ingin menyimpan file ke My Drive milik user (bukan Shared Drive), atau membutuhkan kuota storage user. Langkah-langkah:

1. Aktifkan DWD di Service Account
   - Buka Google Cloud Console > IAM & Admin > Service Accounts
   - Pilih service account Anda
   - Tab "Keys & details" (atau "Details"), pastikan "Enable G Suite Domain-wide Delegation" aktif
   - Catat "Client ID" dari service account tersebut

2. Delegasi di Admin Console (Google Workspace Admin)
   - Admin Console > Security > Access and data control > API controls > Domain-wide delegation
   - Klik "Add new"
   - Isi "Client ID" dengan Client ID service account
   - Scopes: masukkan `https://www.googleapis.com/auth/drive.file`
   - Simpan

3. Konfigurasi aplikasi
   - Di file `.env` isi:
     ```env
     GOOGLE_IMPERSONATE_EMAIL=user_yang_diimpersonate@domain-anda.com
     ```
   - Pastikan `GOOGLE_DRIVE_CREDENTIALS_PATH` tetap menunjuk ke credentials service account
   - Restart server

4. Verifikasi
   - Coba kirim file. File akan tersimpan pada My Drive user yang diimpersonate (atau sesuai struktur default Drive user tersebut)

Catatan:
- Pastikan user yang diimpersonate aktif dan memiliki kuota
- Scope `drive.file` mengizinkan aplikasi membuat/kelola file yang dibuat oleh aplikasi. Jika perlu membaca file lain di My Drive, Anda mungkin membutuhkan scope tambahan (mis. `https://www.googleapis.com/auth/drive`)

