// Hidden from people. Only bots fill it in.
export function Honeypot() {
  return <label className="hp" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>;
}
