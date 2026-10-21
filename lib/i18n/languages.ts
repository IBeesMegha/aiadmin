/**
 * Centralized Internationalization Configuration
 *
 * Single source of truth for the worldwide languages and locale codes that
 * the CMS can offer. This config is intentionally dependency-free (plain data)
 * so it can be imported from the seed script, API routes, and client code.
 *
 * The Prisma `Language` model stores the per-language state (isActive/isDefault),
 * while this catalog defines *which* languages exist and their metadata.
 */

export interface LanguageDefinition {
  /** ISO 639-1 language code, e.g. "en" */
  code: string;
  /** English display name, e.g. "English" */
  name: string;
  /** Endonym / native display name, e.g. "Français" */
  nativeName: string;
  /** Flag emoji for the language */
  flag: string;
  /** BCP 47 locale code for formatting/content, e.g. "fr-FR" */
  locale: string;
}

/** The default language code. Always active and cannot be deactivated. */
export const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Master list of languages available in the CMS.
 * Order here does not matter; the UI/API sorts by default → name.
 */
export const WORLD_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', locale: 'az-AZ' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', locale: 'bg-BG' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', locale: 'bn-BD' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇦🇩', locale: 'ca-ES' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', locale: 'cs-CZ' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', locale: 'da-DK' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', locale: 'el-GR' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', locale: 'et-EE' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', locale: 'fa-IR' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', locale: 'fi-FI' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭', locale: 'fil-PH' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', locale: 'he-IL' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', locale: 'hr-HR' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', locale: 'hu-HU' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', locale: 'hy-AM' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', locale: 'id-ID' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', locale: 'is-IS' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', locale: 'ka-GE' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿', locale: 'kk-KZ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭', locale: 'km-KH' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', locale: 'ko-KR' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦', locale: 'lo-LA' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', locale: 'lt-LT' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', locale: 'lv-LV' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', locale: 'mk-MK' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', locale: 'ml-IN' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', locale: 'mn-MN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', locale: 'mr-IN' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', locale: 'ms-MY' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', locale: 'mt-MT' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲', locale: 'my-MM' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', locale: 'ne-NP' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', locale: 'nl-NL' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', locale: 'nb-NO' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', locale: 'pa-IN' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', locale: 'pl-PL' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', locale: 'ps-AF' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', locale: 'pt-PT' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', locale: 'ro-RO' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', locale: 'ru-RU' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', locale: 'si-LK' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', locale: 'sk-SK' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', locale: 'sl-SI' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', locale: 'sq-AL' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', locale: 'sr-RS' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', locale: 'sv-SE' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', locale: 'sw-KE' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', locale: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', locale: 'te-IN' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', locale: 'th-TH' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', locale: 'uk-UA' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', locale: 'ur-PK' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', flag: '🇺🇿', locale: 'uz-UZ' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', locale: 'vi-VN' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', locale: 'zu-ZA' },
];

/** Look up a language definition by its code. */
export function getLanguageDefinition(code: string): LanguageDefinition | undefined {
  return WORLD_LANGUAGES.find((language) => language.code === code);
}

/** Get the BCP 47 locale code for a language code (falls back to the code). */
export function getLocaleForLanguage(code: string): string {
  return getLanguageDefinition(code)?.locale ?? code;
}
