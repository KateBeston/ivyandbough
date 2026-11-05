const marks = [["visa", "Visa"], ["mastercard", "Mastercard"], ["amex", "American Express"], ["apple-pay", "Apple Pay"], ["google-pay", "Google Pay"]];

export function PaymentMarks() {
  return (
    <ul className="pay-marks" aria-label="Payment methods we accept">
      {marks.map(([file, name]) => <li key={file}><img src={`/payment/${file}.svg`} alt={name} /></li>)}
    </ul>
  );
}
