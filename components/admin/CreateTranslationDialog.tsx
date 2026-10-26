'use client';

/**
 * CreateTranslationDialog
 *
 * Modal that lists the active languages which do not yet have a translation for
 * the current entry. Selecting one asks the parent to create it (the parent
 * owns the create call + navigation, since the source entry differs between the
 * list and edit screens). Already-translated languages are never shown, which
 * prevents duplicate translations.
 */

import React from 'react';
import { Globe, Loader2, X } from 'lucide-react';
import type { Language } from '@/lib/content-i18n-client';

interface CreateTranslationDialogProps {
  open: boolean;
  languages: Language[];
  /** Locale codes that already exist for this entry. */
  existingCodes: string[];
  onClose: () => void;
  onSelect: (locale: string) => void;
  /** Locale currently being created (shows a spinner). */
  creatingLocale?: string | null;
  title?: string;
}

export const CreateTranslationDialog: React.FC<CreateTranslationDialogProps> = ({
  open,
  languages,
  existingCodes,
  onClose,
  onSelect,
  creatingLocale = null,
  title = 'Create translation',
}) => {
  if (!open) return null;

  const available = languages.filter(
    (language) => !existingCodes.includes(language.code)
  );

  const isBusy = creatingLocale !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {available.length === 0 ? (
            <p className="text-sm text-gray-600">
              Every active language already has a translation for this entry.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Pick a language. The translation keeps the same translation
                group but stores its own content and category, so you can edit
                it independently.
              </p>
              <div className="space-y-2">
                {available.map((language) => {
                  const isCreating = creatingLocale === language.code;
                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => onSelect(language.code)}
                      disabled={isBusy}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <span className="text-xl leading-none" aria-hidden>
                        {language.flag || '🏳️'}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          {language.name}
                        </span>
                        {language.nativeName && (
                          <span className="block text-xs text-gray-400">
                            {language.nativeName}
                          </span>
                        )}
                      </span>
                      {isCreating && (
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
