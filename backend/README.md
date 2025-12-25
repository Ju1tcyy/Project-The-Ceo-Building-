# Tenant Management WhatsApp Integration

Sistem integrasi untuk mengirim pesan dan file melalui WhatsApp menggunakan WaziumBot.

## Fitur

- ✅ Mengirim pesan teks ke tenant berdasarkan lantai
- ✅ Mengirim file (gambar, video, audio, dokumen) ke tenant
- ✅ Interface web yang user-friendly
- ✅ Integrasi dengan WaziumBot WhatsApp API
- ✅ Validasi input dan error handling
- ✅ Status feedback real-time

## Struktur Proyek

```
ProjectWeb/
├── index.html          # Interface web utama
├── script.js           # JavaScript untuk handling form dan API calls
├── style.css           # Styling untuk interface
├── WaziumBot/          # WhatsApp Bot backend
│   ├── service/
│   │   └── wazium.js   # API server dengan endpoint /send-message
│   └── ...
└── README.md           # Dokumentasi ini
```

## Cara Penggunaan

### 1. Menjalankan WaziumBot

```bash
cd WaziumBot
npm install
npm start
```

Bot akan berjalan di `http://localhost:3030`

### 2. Membuka Interface Web

Buka file `index.html` di browser atau serve menggunakan web server lokal.

### 3. Mengirim Pesan

1. **Pilih Lantai**: Pilih lantai dari dropdown
2. **Pilih Tenant**: Pilih tenant yang akan menerima pesan
3. **Masukkan Pesan**: Ketik pesan yang akan dikirim (opsional jika mengirim file)
4. **Upload File** (opsional): Pilih file yang akan dikirim
5. **Kirim**: Klik tombol "Kirim Pesan"

## Jenis File yang Didukung

- **Gambar**: JPG, PNG, GIF, WebP
- **Video**: MP4, AVI, MOV, WebM
- **Audio**: MP3, WAV, OGG, M4A
- **Dokumen**: PDF, DOC, DOCX, TXT

## API Endpoints

### POST /send-message

Mengirim pesan atau file ke WhatsApp.

**Request Body:**
```json
{
  "to": "628123456789@s.whatsapp.net",
  "message": {
    "text": "Pesan teks"
  }
}
```

**Atau untuk file:**
```json
{
  "to": "628123456789@s.whatsapp.net",
  "message": {
    "image": { "url": "data:image/jpeg;base64,..." },
    "caption": "Caption untuk gambar"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pesan berhasil dikirim",
  "messageId": "message_id"
}
```

## Konfigurasi Tenant

Data tenant dapat diubah di file `script.js` pada bagian `tenantData`:

```javascript
const tenantData = {
    1: { "MANAGEMENT BUILDING": "6285890392419" },
    2: { "PT SPM": "6285890392419", "PT DYAFERA": "6285890392419" },
    // ... dst
};
```

## Troubleshooting

### Bot belum siap
- Pastikan WaziumBot sudah terhubung ke WhatsApp
- Cek status di `http://localhost:3030/bot-status`

### Gagal mengirim file
- Pastikan file tidak terlalu besar (max ~16MB untuk WhatsApp)
- Cek format file yang didukung

### Error koneksi
- Pastikan WaziumBot berjalan di port 3030
- Cek firewall dan network settings

## Dependencies

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js, WaziumBot (Baileys)
- **WhatsApp**: WhatsApp Web API via Baileys

## Lisensi

Proyek ini menggunakan lisensi yang sama dengan WaziumBot.
