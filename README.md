# *Smart Warehouse Security & Inventory*

Sistem pemantauan inventaris dan kendali keamanan gudang berbasis *Internet of Things* (IoT) menggunakan protokol komunikasi *Message Queuing Telemetry Transport* (*MQTT*). Proyek ini mengintegrasikan simulasi perangkat keras (*hardware*) mikrokontroler dengan *dashboard web* interaktif secara *real-time*.

## 🚀 Tautan Penting
* **Live Dashboard (Vercel):** [https://ta-sistem-tertanam-smart-warehouse.vercel.app/](https://ta-sistem-tertanam-smart-warehouse.vercel.app/)
* **Simulasi Perangkat Keras (Wokwi):**
    * *Node* 1 - Pintu Masuk: `https://wokwi.com/projects/464067726507488257`
    * *Node* 2 - Pintu Keluar: `https://wokwi.com/projects/464071488668808193`
    * *Node* 3 - Pusat Kendali: `https://wokwi.com/projects/464071721623627777`

---

## 🏗️ Arsitektur Sistem

Sistem ini terbagi menjadi empat komponen utama yang saling berkomunikasi secara asinkron melalui *Broker MQTT* publik (`broker.emqx.io`):

1.  **Node 1 (Pintu Masuk):** Menggunakan *ESP32* dan sensor *RFID-RC522*. Berfungsi membaca kartu identitas personel atau barang yang masuk, lalu melakukan *publish* data UID ke topik `gudang/sensor/masuk`.
2.  **Node 2 (Pintu Keluar):** Menggunakan *ESP32* dan sensor *RFID-RC522*. Berfungsi membaca kartu identitas yang keluar, lalu melakukan *publish* data UID ke topik `gudang/sensor/keluar`.
3.  **Node 3 (Pusat Kendali Aktuator):** Menggunakan *ESP32*, *LCD 1602* via *I2C*, *Relay*, dan *Buzzer*. *Node* ini melakukan *subscribe* ke topik `gudang/sensor/#` dan `gudang/control/pintu`. Jika ada akses valid atau perintah manual, *relay* akan aktif (pintu terbuka) dan *buzzer* berbunyi.
4.  **Dashboard Frontend (React):** Aplikasi *web* berbasis *React*, *Vite*, dan *Tailwind CSS* yang bertindak sebagai *client MQTT* via *WebSocket* (*secure port* `8084`). Berfungsi menampilkan total entitas di dalam gudang, memantau status keaktifan perangkat melalui fitur *Last Will and Testament* (*LWT*), serta mengendalikan pintu secara jarak jauh.

---

## 🛠️ Fitur Utama
* **Total Kuantitas Real-time:** Menghitung jumlah personel atau barang di dalam area gudang secara otomatis berdasarkan selisih aktivitas masuk dan keluar.
* **Sistem Log Aktivitas:** Menampilkan catatan interaktif setiap kali kartu terdeteksi atau ada perintah manual masuk beserta penanda waktu (*timestamp*).
* **Pemantau Keaktifan Alat (Heartbeat):** Mendeteksi apakah *Node* 1, *Node* 2, dan *Node* 3 sedang berstatus *Online* atau *Offline* memanfaatkan fitur *Retained Message* dan *LWT*.
* **Kendali Jarak Jauh (Remote Override):** Menyediakan tombol pemicu pada *dashboard* untuk membuka pintu utama dari mana saja dengan mempublikasikan perintah `"OPEN"` ke topik kontrol aktuator.

---

## 💻 Instalasi Lokal (*Client Frontend*)

Jika ingin menjalankan *dashboard frontend* ini di komputer lokal, pastikan sudah memasang *Node.js* lalu ikuti langkah berikut:

1.  **Kloning Repositori:**
    ```bash
    git clone https://github.com/username-kamu/ta-smart-warehouse.git
    cd ta-smart-warehouse
    ```

2.  **Instalasi Dependensi:**
    ```bash
    npm install
    npm install mqtt
    npm install @tailwindcss/vite
    ```

3.  **Konfigurasi Tambahan:**
    Pastikan konfigurasi *plugin* pada berkas `vite.config.js` sudah mendukung *Tailwind CSS* versi terbaru:
    ```javascript
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import tailwindcss from '@tailwindcss/vite'

    export default defineConfig({
      plugins: [
        react(),
        tailwindcss(),
      ],
    })
    ```

4.  **Jalankan Aplikasi:**
    ```bash
    npm run dev
    ```
    Buka tautan lokal (*localhost*) yang muncul di terminal (biasanya `http://localhost:5173/`).

---

## 🔌 Konfigurasi Pin Perangkat Keras (*Hardware Pins*)

### Node 1 & Node 2 (*ESP32* + *RFID-RC522*)
* `VCC` ➡️ `3.3V`
* `GND` ➡️ `GND`
* `SDA (SS)` ➡️ `GPIO 5`
* `SCK` ➡️ `GPIO 18`
* `MOSI` ➡️ `GPIO 23`
* `MISO` ➡️ `GPIO 19`
* `RST` ➡️ `GPIO 22`

### Node 3 (*ESP32* + Aktuator + *LCD I2C*)
* **LCD 1602 I2C:** `SDA` ➡️ `GPIO 21`, `SCL` ➡️ `GPIO 22`
* **Relay Module:** `IN` ➡️ `GPIO 4`
* **Buzzer:** `Pin 2` ➡️ `GPIO 12`

---

## 📝 Catatan Pengujian
Untuk mencegah terjadinya masalah *Client ID Conflict* saat pengujian simultan pada *broker* publik, pastikan fungsi `client.connect("Nama_ID_Unik")` di dalam skrip `.ino` setiap mikrokontroler telah diubah menggunakan pengidentifikasi unik masing-masing (misalnya ditambahkan akhiran NIM atau inisial nama), agar koneksi internet perangkat tidak saling terputus (*looping*).
