import React, { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | DropdownOption)[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  id?: string;
}

function normalize(opt: string | DropdownOption): DropdownOption {
  return typeof opt === 'string' ? { label: opt, value: opt } : opt;
}

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = '-- Select --',
  hasError = false,
  disabled = false,
  id,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const normalizedOptions = options.map(normalize);
  const selected = normalizedOptions.find((o) => o.value === value);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = normalizedOptions.findIndex((o) => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : -1);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  function toggleOpen() {
    if (disabled) return;
    setOpen((prev) => !prev);
  }

  function selectOption(opt: DropdownOption) {
    onChange(opt.value);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, normalizedOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) selectOption(normalizedOptions[highlightedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div
      className={`dd-root${disabled ? ' dd-disabled' : ''}`}
      ref={rootRef}
      id={id}
    >
      <button
        type="button"
        className={`dd-trigger${hasError ? ' dd-error' : ''}${open ? ' dd-open' : ''}`}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`dd-trigger-label${!selected ? ' dd-placeholder' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <i className={`fa-solid fa-chevron-down dd-chevron${open ? ' dd-chevron-open' : ''}`}></i>
      </button>

      {open && (
        <ul className="dd-menu" role="listbox" ref={listRef} tabIndex={-1}>
          <li
            role="option"
            aria-selected={value === ''}
            className={`dd-option dd-option-placeholder${value === '' ? ' dd-option-selected' : ''}${highlightedIndex === -1 ? '' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectOption({ label: placeholder, value: '' })}
          >
            {placeholder}
          </li>
          {normalizedOptions.map((opt, idx) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`dd-option${opt.value === value ? ' dd-option-selected' : ''}${idx === highlightedIndex ? ' dd-option-highlighted' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => selectOption(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
