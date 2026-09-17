import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { LANGUAGES } from '../i18n/translations';

type LanguageSwitcherProps = {
  className?: string;
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className={className ? `language-switcher ${className}` : 'language-switcher'} role="group" aria-label={t('common.language')}>
      {LANGUAGES.map(item => (
        <button
          key={item.code}
          type="button"
          className={item.code === language ? 'language-option active' : 'language-option'}
          aria-pressed={item.code === language}
          onClick={() => setLanguage(item.code)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
