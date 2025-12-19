
import React from 'react';
import { LANGUAGES } from '../constants';
import { Language } from '../types';

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  excludeAuto?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange, excludeAuto }) => {
  const filteredLanguages = excludeAuto 
    ? LANGUAGES.filter(l => l.code !== 'auto') 
    : LANGUAGES;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer focus:ring-0 appearance-none pr-4"
    >
      {filteredLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name} {lang.native !== lang.name ? `(${lang.native})` : ''}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;
