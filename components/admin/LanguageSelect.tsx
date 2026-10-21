'use client';

/**
 * LanguageSelect
 *
 * A small, self-contained language dropdown used across the Content Manager
 * (list, create and edit screens). It shows only the active languages passed
 * in, marks which ones already have a translation and lets the parent decide
 * what happens on selection.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import type { Language } from '@/lib/content-i18n-client';

interface LanguageSelectProps {
  languages: Language[];
  value: string;
  onChange: (code: string) => void;
  /** Locale codes that already have a translation for the current entry. */
  translationCodes?: string[];
  disabled?: boolean;
  /** Optional label rendered above the control. */
  label?: string;
  className?: string;
}

function flagFor(language?: Language): string {
  return language?.flag || '🏳️';
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  languages,
  value,
  onChange,
  translationCodes = [],
  disabled = false,
  label,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = languages.find((language) => language.code === value);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (code: string) => {
    setOpen(false);
    if (code !== value) onChange(code);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition min-w-[12rem] ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="text-lg leading-none" aria-hidden>
          {flagFor(current)}
        </span>
        <span className="flex-1 text-left truncate">
          {current ? current.name : 'Select language'}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[14rem] bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {languages.map((language) => {
            const translated = translationCodes.includes(language.code);
            const isCurrent = language.code === value;

            return (
              <button
                key={language.code}
                type="button"
                onClick={() => handleSelect(language.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                  isCurrent ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {flagFor(language)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-gray-900">{language.name}</span>
                  {language.nativeName && (
                    <span className="block truncate text-xs text-gray-400">
                      {language.nativeName}
                    </span>
                  )}
                </span>

                {translated ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600" title="Translation exists">
                    <Check size={14} />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="No translation yet">
                    <Plus size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
