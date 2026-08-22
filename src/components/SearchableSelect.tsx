import { useEffect, useState } from 'react';

interface Props {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  placeholder?: string;
}

/** Lightweight searchable dropdown backed by a native <datalist> (no extra deps). */
export function SearchableSelect({ id, value, onChange, options, placeholder }: Props) {
  const [text, setText] = useState(value ?? '');

  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  return (
    <>
      <input
        list={id}
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (options.includes(v)) onChange(v);
          else if (v === '') onChange(null);
        }}
        onBlur={() => {
          if (!options.includes(text)) setText(value ?? '');
        }}
      />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
