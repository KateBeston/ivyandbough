const marks = [["visa", "Visa"], ["mastercard", "Mastercard"], ["amex", "American Express"], ["apple-pay", "Apple Pay"], ["google-pay", "Google Pay"]];
// One-colour versions for dark backgrounds (from Simple Icons, CC0).
const mono: Record<string, string> = { visa: "visa", mastercard: "mastercard", amex: "americanexpress", "apple-pay": "applepay", "google-pay": "googlepay" };

export function PaymentMarks({ tone = "colour" }: { tone?: "colour" | "quiet" }) {
  return (
    <ul className={`pay-marks${tone === "quiet" ? " pay-marks-quiet" : ""}`} aria-label="Payment methods we accept">
      {marks.map(([file, name]) => <li key={file}><img src={tone === "quiet" ? `/payment/mono/${mono[file]}.svg` : `/payment/${file}.svg`} alt={name} /></li>)}
    </ul>
  );
}
