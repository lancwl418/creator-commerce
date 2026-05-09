'use client';

interface GhostLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullscreen?: boolean;
  className?: string;
}

const sizePx: Record<NonNullable<GhostLoaderProps['size']>, number> = {
  sm: 80,
  md: 140,
  lg: 200,
};

const textClass: Record<NonNullable<GhostLoaderProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export default function GhostLoader({
  message = '正在努力ghost中',
  size = 'md',
  fullscreen = false,
  className = '',
}: GhostLoaderProps) {
  const px = sizePx[size];
  const wrapper = fullscreen
    ? 'flex flex-col items-center justify-center py-20'
    : 'flex flex-col items-center justify-center py-6';

  return (
    <div className={`${wrapper} ${className}`}>
      <img
        src="/loading/3788.GIF"
        alt="Loading"
        width={px}
        height={px}
        style={{ width: px, height: px }}
        className="object-contain"
      />
      {message && (
        <p className={`mt-3 ${textClass[size]} font-medium text-gray-600`}>
          {message}
        </p>
      )}
    </div>
  );
}
