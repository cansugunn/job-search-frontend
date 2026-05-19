import { useState, useEffect, useRef } from 'react';
import { getCities } from '../api';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CityAutocomplete({ value, onChange, placeholder = 'Şehir...' }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(val: string) {
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 1) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const cities = await getCities({ query: val });
        setSuggestions(cities.map(c => c.name));
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => value.length >= 1 && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #ddd', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map(s => (
            <div
              key={s}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f6fa')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              onMouseDown={() => pick(s)}
            >
              📍 {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
