'use client';
import { useState, useEffect } from 'react';

export default function Logo({ className = 'h-7 md:h-8' }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <img
      src={isDark ? '/logo-dark.svg' : '/logo.svg'}
      alt="Foundry"
      className={className}
    />
  );
}
