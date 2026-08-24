import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const Preferences = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    setTheme(isDarkMode ? 'dark' : 'light');
  }, []);

  const toggleThemeTo = (newTheme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="border-b border-border/50 pb-2">
        <h3 className="text-medium font-semibold text-text">Application Preferences</h3>
        <p className="text-small text-text-muted">Customize your PanelIQ experience</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
            User Interface Theme
          </label>
          
          <div className="flex gap-4">
            <button
              onClick={() => theme !== 'light' && toggleThemeTo('light')}
              className={`flex-1 flex flex-col items-center justify-center p-4 border rounded transition-colors ${
                theme === 'light' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-border bg-surface text-text-muted hover:border-primary/50 hover:text-text'
              }`}
            >
              <Sun className="h-6 w-6 mb-2" />
              <span className="text-small font-semibold">Light Mode</span>
            </button>
            
            <button
              onClick={() => theme !== 'dark' && toggleThemeTo('dark')}
              className={`flex-1 flex flex-col items-center justify-center p-4 border rounded transition-colors ${
                theme === 'dark' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-border bg-surface text-text-muted hover:border-primary/50 hover:text-text'
              }`}
            >
              <Moon className="h-6 w-6 mb-2" />
              <span className="text-small font-semibold">Dark Mode</span>
              <span className="text-[10px] mt-1 opacity-70">(Pure Black)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
