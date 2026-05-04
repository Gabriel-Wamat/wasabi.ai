import Image from 'next/image';

interface LogoProps {
  variant?: 'icon' | 'with-text';
  size?: number;
  className?: string;
}

export function Logo({ variant = 'icon', size = 40, className = '' }: LogoProps) {
  const logoSrc = variant === 'with-text' ? '/logo-with-text.svg' : '/logo.svg';
  const width = variant === 'with-text' ? size * 2 : size;
  
  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="Personal Hub Logo"
        width={width}
        height={size}
        priority
        className="object-contain"
      />
    </div>
  );
}

export default Logo;
