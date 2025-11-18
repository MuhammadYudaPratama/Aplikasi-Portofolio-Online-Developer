Deskripsi Aplikasi Portofolio Online Developer
Aplikasi Portofolio Online Developer ini adalah platform untuk kumpulan developer beserta projectnya yang pernah dibuat oleh developer yang didukung dengan fitur utama yaitu Mode Gelap dan Navigasi Smooth Scroll, platform ini adalah untuk mengenalkan semua developer mulai dari profil developer, skill developer, dan juga project-project developer yang nantinya bisa diakses oleh seluruh masyarakat.

	Cara Instalasi
1.	Install Node.js (jika belum ada)
Download dari: https://nodejs.org/
2.	Install MySQL 
XAMPP: https://www.apachefriends.org/ (paling mudah)
3.	Install text editor seperti Visual Studio Code (VS Code)

	Cara Download dan Install Node.js:
Kunjungi website resmi https://nodejs.org/
Download versi LTS (Long Term Support)
Install dengan mengklik file yang didownload
Ikuti wizard installation (gunakan default settings)
Restart komputer setelah instalasi selesai

	Cek apakah Node.js sudah berhasil diinstall:
1.	Buka PowerShell/terminal VScode di folder backend (cd backend)
2.	lalu cek dengan menggunakan 2 perintah dibawah ini
node –version
npm –version
3.	jika berhasil muncul seperti ini
PS C:\xampp\htdocs\APK Portfolio\backend> node --version   
v24.11.0
PS C:\xampp\htdocs\APK Portfolio\backend> npm --version     
11.6.1

1. Inisialisasi project
npm init –y
2. Install multer untuk upload foto profil
npm install multer
3. Jalankan Server Di terminal VS Code:
PS C:\xampp\htdocs\APK Portfolio\backend> node server.js

*Jika menggunakan VS Code, install extension "Live Server"
*Klik kanan pada file HTML -> "Open with Live Server"
*Atau buka langsung file HTML di browser
