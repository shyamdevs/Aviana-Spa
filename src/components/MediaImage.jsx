import { useState } from 'react';
import { initials, mediaUrl } from '../utils/media';

export default function MediaImage({ src, alt, name = '', className = '', wrapperClassName = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);
  const resolved = mediaUrl(src);
  return (
    <div className={`relative overflow-hidden bg-[#e9e1d5] ${wrapperClassName}`}>
      {!failed && resolved ? (
        <img src={resolved} alt={alt || name} loading={loading} onError={() => setFailed(true)} className={className || 'h-full w-full object-cover'} />
      ) : (
        <div aria-label={alt || name} className={`grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#f7efe5,#d6c1a6)] font-serif text-4xl text-[#8e6f46] ${className}`} role="img">
          {initials(name)}
        </div>
      )}
    </div>
  );
}
