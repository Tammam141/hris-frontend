import { z } from 'zod';

import { FULL_NAME_REGEX, FULL_NAME_INVALID_MSG } from '../../utils/nameValidation';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MAX_MSG,
  PASSWORD_UPPERCASE_REGEX,
  PASSWORD_UPPERCASE_MSG,
  PASSWORD_LOWERCASE_REGEX,
  PASSWORD_LOWERCASE_MSG,
  PASSWORD_NUMBER_REGEX,
  PASSWORD_NUMBER_MSG,
  PASSWORD_SYMBOL_REGEX,
  PASSWORD_SYMBOL_MSG,
} from '../../utils/passwordValidation';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(150, 'Nama lengkap maksimal 150 karakter')
    .regex(FULL_NAME_REGEX, FULL_NAME_INVALID_MSG),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid, contoh: nama@domain.com'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
    .max(PASSWORD_MAX_LENGTH, PASSWORD_MAX_MSG)
    .regex(PASSWORD_UPPERCASE_REGEX, PASSWORD_UPPERCASE_MSG)
    .regex(PASSWORD_LOWERCASE_REGEX, PASSWORD_LOWERCASE_MSG)
    .regex(PASSWORD_NUMBER_REGEX, PASSWORD_NUMBER_MSG)
    .regex(PASSWORD_SYMBOL_REGEX, PASSWORD_SYMBOL_MSG),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Nomor telepon harus diawali kode negara, contoh: +628123456789'),
  gender: z.enum(['male', 'female'], { message: 'Jenis kelamin wajib dipilih' }),
  terms_accepted: z.boolean().refine((val) => val === true, { message: 'Kamu harus menyetujui syarat dan ketentuan' })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

