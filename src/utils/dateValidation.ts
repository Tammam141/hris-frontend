export interface DateValidationResult {
  field: string;
  message: string;
}

export function validateEmployeeDates(birthDate?: string, joinDate?: string): DateValidationResult[] {
  const errors: DateValidationResult[] = [];
  const today = new Date();
  
  // Set today to midnight to avoid time-of-day discrepancies
  today.setHours(0, 0, 0, 0);

  let bDate: Date | null = null;
  let jDate: Date | null = null;

  if (birthDate) {
    bDate = new Date(birthDate);
    if (!isNaN(bDate.getTime())) {
      let age = today.getFullYear() - bDate.getFullYear();
      const m = today.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
        age--;
      }

      if (age < 15) {
        errors.push({ field: 'birth_date', message: 'Usia karyawan minimal 15 tahun' });
      }
      if (age > 100) {
        errors.push({ field: 'birth_date', message: 'Tanggal lahir terlalu jauh ke belakang, periksa kembali' });
      }
    }
  }

  if (joinDate) {
    jDate = new Date(joinDate);
    if (!isNaN(jDate.getTime())) {
      // Check max +365 days from today
      const maxJoinDate = new Date(today);
      maxJoinDate.setDate(maxJoinDate.getDate() + 365);
      
      if (jDate > maxJoinDate) {
        errors.push({ field: 'join_date', message: 'Tanggal bergabung paling jauh 365 hari ke depan' });
      }
    }
  }

  if (bDate && jDate && !isNaN(bDate.getTime()) && !isNaN(jDate.getTime())) {
    if (jDate < bDate) {
      errors.push({ field: 'join_date', message: 'Tanggal bergabung tidak boleh mendahului tanggal lahir' });
    }
  }

  return errors;
}
