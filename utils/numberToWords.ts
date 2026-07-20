
export const numberToWords = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return 'Zero Shillings Only';
  }
  
  let val = Math.round(num);
  if (val === 0) return 'Zero Shillings Only';
  
  let prefix = '';
  if (val < 0) {
    prefix = 'Minus ';
    val = Math.abs(val);
  }

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convert_tens = (n: number): string => {
    n = Math.floor(n);
    if (n < 0) return '';
    if (n < 10) return ones[n] || '';
    if (n >= 10 && n < 20) return teens[n - 10] || '';
    const tenDigit = Math.floor(n / 10);
    const oneDigit = n % 10;
    return `${tens[tenDigit] || ''} ${ones[oneDigit] || ''}`.trim();
  };

  const convert_hundreds = (n: number): string => {
    n = Math.floor(n);
    if (n > 99) {
      const hundredDigit = Math.floor(n / 100);
      const rest = n % 100;
      const restWords = convert_tens(rest);
      return `${ones[hundredDigit] || ''} Hundred ${restWords}`.trim();
    }
    return convert_tens(n);
  };

  const convert_thousands = (n: number): string => {
    n = Math.floor(n);
    if (n >= 1000) {
      const thousandPart = Math.floor(n / 1000);
      const restPart = n % 1000;
      return `${convert_hundreds(thousandPart)} Thousand ${convert_hundreds(restPart)}`.trim();
    }
    return convert_hundreds(n);
  };

  let result = '';
  if (val >= 1000000) {
    const millionPart = Math.floor(val / 1000000);
    const rest = val % 1000000;
    result = `${convert_thousands(millionPart)} Million ${convert_thousands(rest)}`.trim();
  } else {
    result = convert_thousands(val);
  }

  return (prefix + result).trim().replace(/\s+/g, ' ') + ' Shillings Only';
};
