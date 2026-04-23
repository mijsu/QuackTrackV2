'use client';

import React from 'react';
import Image from 'next/image';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 lg:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Brand & Copyright */}
          <div className="flex items-center gap-2">
            <Image
              src="/ptc-app-logo.jpg"
              alt="PTC Logo"
              width={18}
              height={18}
              className="rounded"
              unoptimized
            />
            <span className="text-xs text-muted-foreground">
              © {currentYear} PTC · QuackTrack v2.0.0
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <a href="mailto:it@ptc.edu.ph" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Contact IT
            </a>
            <span className="text-muted-foreground/30">·</span>
            <a href="https://ptc.edu.ph" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              ptc.edu.ph
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
