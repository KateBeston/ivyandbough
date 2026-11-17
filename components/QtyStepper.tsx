"use client";

// A − 1 + control for choosing how many to add. Capped at 20, matching the basket.
export function QtyStepper({ value, onChange, label = "Quantity", size = "small" }: { value: number; onChange: (n: number) => void; label?: string; size?: "small" | "large" }) {
  const set = (n: number) => onChange(Math.min(20, Math.max(1, n)));
  return (
    <div className={`stepper ${size}`} role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">−</button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => set(value + 1)} disabled={value >= 20} aria-label="Increase quantity">+</button>
    </div>
  );
}
