import { useEffect, useRef } from 'react';

interface SkipLinkProps {
  targetId: string;
  children: React.ReactNode;
}

export const SkipLink = ({ targetId, children }: SkipLinkProps) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = document.getElementById(targetId);
        target?.focus();
      }
    };

    const link = linkRef.current;
    link?.addEventListener('keydown', handleKeyDown);

    return () => {
      link?.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetId]);

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
    >
      {children}
    </a>
  );
};
