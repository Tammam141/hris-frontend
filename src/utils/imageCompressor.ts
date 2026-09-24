export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
}

/**
 * Mengompresi file gambar di sisi browser menggunakan HTML5 Canvas.
 * Ini mengurangi ukuran file 50-75% sambil menjaga kejelasan gambar.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.7, // Kualitas 70% biasanya optimal untuk ukuran file vs kejelasan
  } = options;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Gunakan webp untuk png/webp agar transparansi terjaga dan kompresi maksimal, jpeg untuk lainnya.
  const mimeType = (file.type === 'image/png' || file.type === 'image/webp') ? 'image/webp' : 'image/jpeg';

  const imageUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      URL.revokeObjectURL(imageUrl);

      let width = img.width;
      let height = img.height;

      // Perkecil dimensi gambar jika melebihi batas maksimal
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file); // Fallback ke file asli jika canvas gagal
      }

      // Gambar ulang image ke canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi canvas menjadi Blob (file baru)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }

          // Sesuaikan ekstensi nama file baru
          let newName = file.name;
          if (mimeType === 'image/webp' && !newName.toLowerCase().endsWith('.webp')) {
            newName = newName.replace(/\.[^/.]+$/, "") + ".webp";
          } else if (mimeType === 'image/jpeg' && !newName.toLowerCase().match(/\.(jpg|jpeg)$/)) {
            newName = newName.replace(/\.[^/.]+$/, "") + ".jpg";
          }

          const compressedFile = new File([blob], newName, {
            type: mimeType,
            lastModified: Date.now(),
          });

          // Jika entah bagaimana file hasil kompresi malah lebih besar, gunakan file aslinya
          if (compressedFile.size >= file.size) {
            resolve(file);
          } else {
            resolve(compressedFile);
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(file); // Fallback jika gagal memuat gambar
    };
  });
}
