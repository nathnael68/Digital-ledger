/**
 * Formats a monetary amount into Ethiopian Birr (ETB) display format.
 */
export function formatCurrency(amount: number | string): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numeric)) return '0.00 ETB';
  return `${numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

/**
 * Formats a timestamp into Addis Ababa local time string.
 */
export function formatDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date string (YYYY-MM-DD or ISO timestamp) into Addis Ababa date display.
 */
export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

/**
 * Formats a numeric amount with 2 decimal places and thousands separators (e.g., 1,566.00).
 */
export function formatNumber(amount: number | string): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numeric)) return '0.00';
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertUnderThousand(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  if (num < 100) {
    const rem = num % 10;
    return TENS[Math.floor(num / 10)] + (rem ? ' ' + ONES[rem] : '');
  }
  const rem = num % 100;
  return ONES[Math.floor(num / 100)] + ' Hundred' + (rem ? ' ' + convertUnderThousand(rem) : '');
}

/**
 * Converts a monetary figure into standard English words for Ethiopian fiscal attachments and invoices.
 * Example: 1800.90 -> "One Thousand Eight Hundred and Ninety Cents Only"
 */
export function numberToWords(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) return 'Zero Cents Only';

  const intPart = Math.floor(num);
  const cents = Math.round((num - intPart) * 100);

  const thousands = ['', 'Thousand', 'Million', 'Billion'];
  let current = intPart;
  const parts: string[] = [];
  let tier = 0;

  if (current === 0) {
    parts.push('Zero');
  } else {
    while (current > 0) {
      const chunk = current % 1000;
      if (chunk !== 0) {
        const words = convertUnderThousand(chunk);
        const suffix = thousands[tier] ? ' ' + thousands[tier] : '';
        parts.unshift(words + suffix);
      }
      current = Math.floor(current / 1000);
      tier++;
    }
  }

  const intWords = parts.join(' ').trim();
  if (cents > 0) {
    const centsWords = convertUnderThousand(cents);
    return `${intWords} and ${centsWords} Cents Only`;
  }
  return `${intWords} Only`;
}
