import React, { useEffect, useRef, useState } from 'react';

interface MultiSelectDropdownProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  id?: string;
}

export default function MultiSelectDropdown({
  value,
  onChange,
  options,
  placeholder = '-- Select --',
  hasError = false,
  disabled = false,
  id,
}: MultiSelectDropdownProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setListOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function toggleMenu() {
    if (disabled) return;
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) setListOpen(false);
      return next;
    });
  }

  function toggleList() {
    if (disabled) return;
    setListOpen((prev) => {
      const next = !prev;
      if (next) setMenuOpen(false);
      return next;
    });
  }

  function toggleValue(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

  function removeValue(opt: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== opt));
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setMenuOpen(true);
      setListOpen(false);
    } else if (e.key === 'Escape') {
      setMenuOpen(false);
    }
  }

  const summaryLabel =
    value.length === 0
      ? ''
      : value.length === 1
      ? value[0]
      : `${value[0]} +${value.length - 1}`;

  return (
    <div
      className={`dd-root${disabled ? ' dd-disabled' : ''}`}
      ref={rootRef}
      id={id}
    >
      {/* Trigger: plain dropdown, no chips inside */}
      <button
        type="button"
        className={`dd-trigger${hasError ? ' dd-error' : ''}${menuOpen ? ' dd-open' : ''}`}
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        disabled={disabled}
      >
        <span className="dd-trigger-label dd-placeholder">{placeholder}</span>
        <i className={`fa-solid fa-chevron-down dd-chevron${menuOpen ? ' dd-chevron-open' : ''}`}></i>
      </button>

      {menuOpen && (
        <ul className="dd-menu" role="listbox" tabIndex={-1}>
          {options.length === 0 && (
            <li className="dd-option dd-option-placeholder">No options available</li>
          )}
          {options.map((opt) => {
            const checked = value.includes(opt);
            return (
              <li
                key={opt}
                role="option"
                aria-selected={checked}
                className={`dd-option dd-option-multi${checked ? ' dd-option-selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleValue(opt)}
              >
                <span className={`dd-checkbox${checked ? ' dd-checkbox-checked' : ''}`}>
                  {checked && <i className="fa-solid fa-check"></i>}
                </span>
                {opt}
              </li>
            );
          })}
        </ul>
      )}

      {/* Summary box: shows "First Name +N", click to expand the list below */}
      {value.length > 0 && (
        <button
          type="button"
          className="dd-summary-box"
          onClick={toggleList}
          aria-expanded={listOpen}
        >
          <span className="dd-summary-label">{summaryLabel}</span>
          <i className={`fa-solid fa-chevron-down dd-chevron${listOpen ? ' dd-chevron-open' : ''}`}></i>
        </button>
      )}

      {/* Expanded list: hidden by default, toggled by the summary box */}
      {listOpen && value.length > 0 && (
        <div className="dd-expanded-list">
          {value.map((v) => (
            <div className="dd-expanded-row" key={v}>
              <span>{v}</span>
              <i
                className="fa-solid fa-xmark dd-expanded-remove"
                onClick={(e) => removeValue(v, e)}
                role="button"
                aria-label={`Remove ${v}`}
              ></i>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}