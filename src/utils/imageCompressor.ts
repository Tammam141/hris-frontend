export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  convertToJpeg?: boolean; // Selalu konversi ke JPEG (berguna untuk foto profil)
}

/**
 * Memeriksa apakah gambar pada canvas memiliki piksel transparan (alpha < 255)
 */
function checkTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height).data;
    const len = imgData.length;
    for (let i = 3; i < len; i += 4) {
      if (imgData[i] < 255) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Mengompresi file gambar di sisi browser menggunakan HTML5 Canvas.
 * - Mengonversi PNG tanpa transparansi (atau jika convertToJpeg aktif) menjadi JPEG
 *   karena kompresi quality pada canvas.toBlob hanya efektif pada lossy format (JPEG/WebP).
 * - Menjaga format MIME type sesuai aturan dan menghasilkan berkas yang optimal.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.7, // Kualitas 70% biasanya optimal untuk ukuran file vs kejelasan
    convertToJpeg = false,
  } = options;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Tentukan MIME type dasar
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
      mimeType = 'image/jpeg';
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

      let targetMimeType = mimeType;

      if (file.type === 'image/png') {
        const hasAlpha = checkTransparency(ctx, width, height);
        // Konversi ke JPEG jika gambar tidak memiliki transparansi ATAU opsi convertToJpeg aktif (misal foto profil)
        if (!hasAlpha || convertToJpeg) {
          targetMimeType = 'image/jpeg';
          if (hasAlpha) {
            // Beri background putih agar area transparan tidak menjadi hitam saat dikonversi ke JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
          }
        }
      } else if (convertToJpeg && targetMimeType !== 'image/jpeg') {
        targetMimeType = 'image/jpeg';
      }

      // Konversi canvas menjadi Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }

          let outputFileName = file.name;
          if (targetMimeType === 'image/jpeg' && !/\.(jpe?g)$/i.test(file.name)) {
            outputFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          }

          const compressedFile = new File([blob], outputFileName, {
            type: targetMimeType,
            lastModified: Date.now(),
          });

          // Jika entah bagaimana file hasil kompresi malah lebih besar, gunakan file aslinya
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
