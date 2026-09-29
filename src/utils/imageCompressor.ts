export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (digunakan untuk format lossy seperti JPEG/WebP)
}

/**
 * Mengompresi file gambar di sisi browser menggunakan HTML5 Canvas.
 * - Format MIME type dan ekstensi berkas selalu dipertahankan sama persis dengan aslinya
 *   (misal .png tetap .png, .jpg tetap .jpg, .webp tetap .webp).
 * - Ukuran berkas diperkecil dengan penyesuaian dimensi resolusi (maxWidth/maxHeight)
 *   dan rasio kompresi.
 * - Nama file asli tidak diubah.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
  } = options;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Tentukan MIME type target yang sama persis dengan format asli
  let targetMimeType = file.type;
  if (targetMimeType === 'image/jpg') {
    targetMimeType = 'image/jpeg';
  }

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

      // Gambar ulang image ke canvas (transparansi PNG/WebP tetap terjaga)
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi canvas menjadi Blob sesuai format MIME type asli
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }

          // Pertahankan nama file asli persis apa adanya
          const outputFileName = file.name;

          const compressedFile = new File([blob], outputFileName, {
            type: targetMimeType,
            lastModified: Date.now(),
          });

          // Jika ukuran hasil kompresi malah lebih besar dari file asli, pertahankan file aslinya
          if (compressedFile.size >= file.size) {
            resolve(file);
          } else {
            resolve(compressedFile);
          }
        },
        targetMimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(file); // Fallback jika gagal memuat gambar
    };
  });
}
