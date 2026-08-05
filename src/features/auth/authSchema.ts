import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const registerSchema = z.object({
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid, contoh: nama@domain.com'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Nomor telepon harus diawali kode negara, contoh: +628123456789'),
  gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Jenis kelamin wajib dipilih' }) }),
  terms_accepted: z.boolean().refine((val) => val === true, { message: 'Kamu harus menyetujui syarat dan ketentuan' })
});
