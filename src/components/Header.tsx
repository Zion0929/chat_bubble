import React from 'react';
import '@fontsource/audiowide';

const Header: React.FC = () => {
  return (
    <header className="bg-transparent fixed top-0 left-0 right-0 z-50 hidden md:block">
      <div className="w-full px-2 h-10 flex items-center" >
        {/* Logo */}
        <div className="flex-1 flex items-center">
          <a href="/" className="flex items-center">
            <img src="/img/logo.svg" alt="logo" className="h-6 w-6 mr-2" />
            <span style={{ fontFamily: 'Audiowide, system-ui', color: '#ff6600' }} className="text-2xl">
              Zion不是AI
            </span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header; 