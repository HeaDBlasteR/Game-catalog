import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

type ThemeSwitcherProps = {
  className?: string;
};

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');

  return (
    <button
      type="button"
      className={className ? `theme-switcher ${className}` : 'theme-switcher'}
      onClick={toggleTheme}
      title={label}
      aria-label={label}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
};

export default ThemeSwitcher;
