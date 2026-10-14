# Lyrics untuk VS Code

Lirik lagu di sidebar saat Anda bekerja. Extension membaca metadata player Linux melalui D-Bus/MPRIS dan mencari lirik di [LRCLIB](https://lrclib.net). Mendukung lirik sinkron dan pencarian manual, tanpa akun atau API key.

## Menjalankan dari source

1. Buka direktori ini di VS Code desktop.
2. Jalankan `npm ci --omit=optional` (Node.js 22 atau lebih baru untuk tooling).
3. Tekan **F5**, pilih **Jalankan Lyrics**.
4. Pada jendela Extension Development Host, klik ikon **Lyrics** di Activity Bar, atau jalankan **Lyrics: Buka Sidebar** dari Command Palette.
5. Putar lagu di Brave, Firefox, Spotify, VLC, atau player lain yang menyediakan MPRIS.

Tidak memerlukan `playerctl`. VS Code harus berjalan pada sesi desktop Linux yang sama dengan player, dengan session D-Bus dapat diakses. Pada Remote SSH/WSL/Dev Containers, extension berjalan pada sisi UI lokal; deteksi otomatis memerlukan komputer UI Linux.

## Penggunaan

- **Otomatis** memilih player yang sedang memutar lagu. Gunakan **Sumber** untuk memilih player tertentu.
- Lirik dengan timestamp menyorot baris aktif mengikuti posisi lagu. Pause/resume dan seek mengikuti informasi dari player.
- Gulir lirik sendiri untuk menghentikan gulir otomatis. Tekan **Ikuti lirik** untuk melanjutkan.
- Masukkan judul atau artis pada **Cari lirik**, lalu pilih hasil. Pilihan manual menampilkan teks tanpa sinkronisasi.
- Pilihan manual bertahan sampai lagu di sumber terpilih berganti. Tekan **Ikuti pemutar** untuk kembali lebih awal.
- **Coba lagi** mengulang pengambilan lirik. **Sambungkan ulang** mencoba koneksi D-Bus kembali.

## Batas dukungan dan privasi

Deteksi otomatis versi pertama hanya Linux. Browser/situs harus membagikan metadata MPRIS; extension tidak membaca tab, merekam suara, atau mengenali audio. Judul video, artis yang keliru, serta perbedaan versi live/remix dapat menyebabkan lirik tidak ditemukan. Gunakan pencarian manual untuk memilih versi yang benar. Player tanpa informasi posisi tidak menjamin sinkronisasi lirik. Saat beberapa player memutar bersamaan, pilihan otomatis mempertahankan sumber yang masih aktif; pilih sumber secara manual bila diperlukan.

Judul, artis, album, durasi atau kueri pencarian dikirim melalui HTTPS ke LRCLIB untuk mencari lirik. Tidak ada telemetry, token akun, penyimpanan riwayat, atau server perantara. Cache maksimal 100 respons hanya berada di memori sesi. Lirik bersumber dari LRCLIB; ketersediaan, ketepatan, dan hak atas konten mengikuti sumber/pemegang hak. Atribusi tersedia di footer sidebar.

## Pengujian dan paket

```sh
npm test
npm run check
npm run package
```

Hasil: `vscode-lyrics-0.1.0.vsix` di direktori ini. Pasang melalui **Extensions → … → Install from VSIX…**, atau:

```sh
code --install-extension ./vscode-lyrics-0.1.0.vsix
```

Pengujian memakai `node:test` untuk parser LRC, metadata D-Bus, pemilihan sumber, pencocokan lirik, cache/HTTP, pencarian manual, dan respons pencarian kedaluwarsa. Pengujian unit tidak memerlukan player, VS Code, atau internet. Verifikasi UI dilakukan pada Extension Development Host; perubahan playback dilakukan melalui player asli.

## Struktur

- `src/`: integrasi VS Code, D-Bus, layanan lirik, dan state sesi.
- `media/`: ikon Activity Bar dan sidebar HTML/CSS/JavaScript (HTML dibuat oleh provider).
- `test/`: pengujian logika dengan Node.js.
- `.vscode/launch.json`: konfigurasi debug F5.

Tidak ada framework frontend atau proses build aplikasi. `dbus-next` membaca media; `undici` mengatur koneksi HTTP per klien agar percobaan alamat IP tidak terlalu singkat. Keduanya dependensi runtime; `@vscode/vsce` hanya tooling pengemasan.
