import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  variant?: 'default' | 'white' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
  priority?: boolean;
};

const dimensions = {
  default: {
    sm: { width: 126, height: 30 },
    md: { width: 148, height: 36 },
    lg: { width: 168, height: 40 },
  },
  white: {
    sm: { width: 126, height: 30 },
    md: { width: 148, height: 36 },
    lg: { width: 168, height: 40 },
  },
  icon: {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
  },
} as const;

const sources = {
  default: '/logo-emitia.png',
  white: '/logo-emitia-white.svg',
  icon: '/logo-emitia-icon.svg',
} as const;

export function BrandLogo({
  variant = 'default',
  size = 'md',
  href = '/',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const { width, height } = dimensions[variant][size];
  const src = sources[variant];

  const image = (
    <Image
      src={src}
      alt="EMITIA"
      width={width}
      height={height}
      priority={priority}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ width, height: 'auto', maxHeight: height }}
    />
  );

  if (!href) {
    return image;
  }

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="EMITIA — Inicio">
      {image}
    </Link>
  );
}
