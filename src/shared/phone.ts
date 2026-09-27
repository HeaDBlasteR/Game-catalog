export function formatRussianPhone(rawValue: string): string {
  const digitsOnly = rawValue.replace(/\D/g, '');
  if (!digitsOnly) return '';

  let normalizedDigits = digitsOnly;

  if (normalizedDigits.startsWith('8')) {
    normalizedDigits = `7${normalizedDigits.slice(1)}`;
  } else if (!normalizedDigits.startsWith('7')) {
    normalizedDigits = `7${normalizedDigits}`;
  }

  normalizedDigits = normalizedDigits.slice(0, 11);
  const subscriber = normalizedDigits.slice(1);

  let formatted = '+7';

  if (subscriber.length > 0) {
    formatted += ` (${subscriber.slice(0, 3)}`;
  }
  if (subscriber.length > 3) {
    formatted += `) ${subscriber.slice(3, 6)}`;
  }
  if (subscriber.length > 6) {
    formatted += `-${subscriber.slice(6, 8)}`;
  }
  if (subscriber.length > 8) {
    formatted += `-${subscriber.slice(8, 10)}`;
  }

  return formatted;
}

export function hasPhoneNumber(formattedValue: string): boolean {
  return formattedValue.replace(/\D/g, '').length > 1;
}
