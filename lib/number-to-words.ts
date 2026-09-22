// Converts a number to its Spanish text representation (Argentine style)
// e.g. 152122.14 => "ciento cincuenta y dos mil ciento veintidos con 14/100"

const UNITS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TENS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  let result = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    result += HUNDREDS[hundreds];
    if (remainder > 0) result += ' ';
  }

  if (remainder >= 10 && remainder <= 19) {
    result += TEENS[remainder - 10];
  } else if (remainder >= 21 && remainder <= 29) {
    result += 'veinti' + UNITS[remainder - 20];
  } else if (remainder >= 20) {
    const tens = Math.floor(remainder / 10);
    const units = remainder % 10;
    result += TENS[tens];
    if (units > 0) result += ' y ' + UNITS[units];
  } else if (remainder > 0) {
    result += UNITS[remainder];
  }

  return result;
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'cero';

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let text = '';

  if (integerPart === 0) {
    text = 'cero';
  } else {
    const billions = Math.floor(integerPart / 1000000000);
    const millions = Math.floor((integerPart % 1000000000) / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    if (billions > 0) {
      if (billions === 1) {
        text += 'un billón ';
      } else {
        text += convertGroup(billions) + ' billones ';
      }
    }

    if (millions > 0) {
      if (millions === 1) {
        text += 'un millón ';
      } else {
        text += convertGroup(millions) + ' millones ';
      }
    }

    if (thousands > 0) {
      if (thousands === 1) {
        text += 'mil ';
      } else {
        text += convertGroup(thousands) + ' mil ';
      }
    }

    if (remainder > 0) {
      text += convertGroup(remainder);
    }
  }

  text = text.trim();

  // Capitalize first letter
  const capitalizedText = text.charAt(0).toUpperCase() + text.slice(1);

  const centavosStr = String(decimalPart).padStart(2, '0');
  return `Son Pesos ${capitalizedText} con ${centavosStr}/100`;
}

export function numberToWordsSimple(amount: number): string {
  if (amount === 0) return 'cero';
  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);
  
  let text = '';
  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    text += (millions === 1 ? 'un millón ' : convertGroup(millions) + ' millones ');
  }
  if (thousands > 0) {
    text += (thousands === 1 ? 'mil ' : convertGroup(thousands) + ' mil ');
  }
  if (remainder > 0) {
    text += convertGroup(remainder);
  }
  text = text.trim();
  const centavosStr = String(decimalPart).padStart(2, '0');
  return `${text} con ${centavosStr} centavos`;
}
