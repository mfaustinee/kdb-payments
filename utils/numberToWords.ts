
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convert_thousands = (num: number): string => {
    if (num >= 1000) {
      return convert_hundreds(Math.floor(num / 1000)) + ' Thousand ' + convert_hundreds(num % 1000);
    } else {
      return convert_hundreds(num);
    }
  };

  const convert_hundreds = (num: number): string => {
    if (num > 99) {
      return ones[Math.floor(num / 100)] + ' Hundred ' + convert_tens(num % 100);
    } else {
      return convert_tens(num);
    }
  };

  const convert_tens = (num: number): string => {
    if (num < 10) return ones[num];
    else if (num >= 10 && num < 20) return teens[num - 10];
    else {
      return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
    }
  };

  if (num === 0) return 'Zero';
  
  // Handle millions if needed, but for arrears thousands is usually enough. 
  // Let's add simple million support.
  if (num >= 1000000) {
    return convert_thousands(Math.floor(num / 1000000)) + ' Million ' + convert_thousands(num % 1000000);
  }

  return convert_thousands(num).trim() + ' Shillings Only';
};
