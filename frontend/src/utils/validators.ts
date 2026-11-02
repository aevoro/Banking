export function isValidBelarusPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s\-()]/g, '');
  // Supports all mobile codes (25, 29, 33, 44), city codes (17, etc.) and any 9-digit Belarus number
  return /^\+375\d{9}$/.test(normalized);
}

export function isValidIban(iban: string): boolean {
  const normalized = iban.replace(/\s/g, '').toUpperCase();
  return /^BY\d{2}[A-Z0-9]{4}\d{20}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTransferAmount(
  amount: number,
  availableBalance: number
): { valid: boolean; error?: string } {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Сумма перевода должна быть больше нуля' };
  }
  if (amount > availableBalance) {
    return {
      valid: false,
      error: `Недостаточно средств. Доступно: ${availableBalance.toFixed(2)}`,
    };
  }
  return { valid: true };
}
