export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
}

/**
 * Mengompresi file gambar di sisi browser menggunakan HTML5 Canvas.
 * Menjaga nama file asli dan format MIME type sesuai dengan file yang diunggah.
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

  // Tentukan MIME type berdasarkan tipe file asli menggunakan switch-case
  let mimeType: string;
  switch (file.type) {
    case 'image/png':
      mimeType = 'image/png';
      break;
    case 'image/webp':
      mimeType = 'image/webp';
      break;
    case 'image/jpeg':
    case 'image/jpg':
      mimeType = 'image/jpeg';
      break;
    default:
      mimeType = file.type || 'image/jpeg';
      break;
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

      // Gambar ulang image ke canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi canvas menjadi Blob dengan format MIME type asli
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }

          // Gunakan nama file asli tanpa mengubah ekstensi atau nama file
          const compressedFile = new File([blob], file.name, {
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
