import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CurrencyCode } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BYN: 'BYN',
  USD: '$',
  EUR: '€',
  RUB: '₽',
};

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  options?: { showSymbolOnly?: boolean; fractionDigits?: number }
): string {
  const fractionDigits = options?.fractionDigits ?? 2;
  const formattedNumber = new Intl.NumberFormat('ru-BY', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

  if (options?.showSymbolOnly) {
    return `${formattedNumber} ${CURRENCY_SYMBOLS[currency]}`;
  }

  return `${formattedNumber} ${currency}`;
}

export function formatAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '';
  // Format BY20BNKG30120000000000000000 into chunks of 4 characters
  return accountNumber.match(/.{1,4}/g)?.join(' ') || accountNumber;
}

export function maskAccountNumber(accountNumber: string, showFull: boolean = false): string {
  if (!accountNumber) return '';
  if (showFull) {
    return formatAccountNumber(accountNumber);
  }
  const clean = accountNumber.replace(/\s/g, '');
  if (clean.length < 8) return '••••';
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix} •••• •••• ${suffix}`;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('375') && cleaned.length === 12) {
    const operator = cleaned.slice(3, 5);
    const p1 = cleaned.slice(5, 8);
    const p2 = cleaned.slice(8, 10);
    const p3 = cleaned.slice(10, 12);
    return `+375 (${operator}) ${p1}-${p2}-${p3}`;
  }
  return phone;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Сегодня, ${date.toLocaleTimeString('ru-BY', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('ru-BY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
