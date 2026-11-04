"use client";

import { useEffect, useRef, useState } from "react";

export type PickedAddress = { line1: string; city: string; state: string; postcode: string };
type Suggestion = { text: string; prediction: { toPlace: () => Place } };
type Place = { fetchFields: (o: { fields: string[] }) => Promise<unknown>; addressComponents?: { types: string[]; longText: string; shortText: string }[] };
type Places = {
  AutocompleteSuggestion: { fetchAutocompleteSuggestions: (r: Record<string, unknown>) => Promise<{ suggestions: { placePrediction?: { text: { text: string }; toPlace: () => Place } | null }[] }> };
  AutocompleteSessionToken: new () => unknown;
};

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let loading: Promise<Places> | null = null;

function loadPlaces() {
  loading ??= new Promise<Places>((resolve, reject) => {
    const w = window as unknown as { __ibPlaces?: () => void; google?: { maps: { importLibrary: (n: string) => Promise<Places> } } };
    w.__ibPlaces = () => { w.google!.maps.importLibrary("places").then(resolve, reject); };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY!)}&loading=async&callback=__ibPlaces&region=AU`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Places did not load"));
    document.head.appendChild(script);
  });
  return loading;
}

// Suggests Australian addresses. If Google is unavailable, the manual fields still work.
export function AddressLookup({ onPick }: { onPick: (address: PickedAddress) => void }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [off, setOff] = useState(!KEY);
  const token = useRef<unknown>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function search(value: string) {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 4) return setOptions([]);
    timer.current = setTimeout(async () => {
      try {
        const places = await loadPlaces();
        token.current ??= new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: value, includedRegionCodes: ["au"], sessionToken: token.current });
        setOptions(suggestions.flatMap((s) => (s.placePrediction ? [{ text: s.placePrediction.text.text, prediction: s.placePrediction }] : [])).slice(0, 5));
      } catch {
        setOff(true);
      }
    }, 250);
  }

  async function pick(option: Suggestion) {
    setOptions([]);
    setText(option.text);
    token.current = null;
    try {
      const place = option.prediction.toPlace();
      await place.fetchFields({ fields: ["addressComponents"] });
      const part = (type: string, short = false) => { const c = place.addressComponents?.find((x) => x.types.includes(type)); return (short ? c?.shortText : c?.longText) ?? ""; };
      const street = [part("street_number"), part("route")].filter(Boolean).join(" ");
      const unit = part("subpremise");
      onPick({ line1: unit ? `${unit}/${street}` : street, city: part("locality") || part("sublocality") || part("postal_town"), state: part("administrative_area_level_1", true), postcode: part("postal_code") });
    } catch {
      setOff(true);
    }
  }

  if (off) return null;
  return (
    <div className="address-lookup">
      <label>Find your address<input value={text} onChange={(e) => search(e.target.value)} autoComplete="off" placeholder="Start typing your address" /></label>
      {options.length > 0 && <ul>{options.map((o) => <li key={o.text}><button type="button" onClick={() => pick(o)}>{o.text}</button></li>)}</ul>}
    </div>
  );
}
