import { useState, useEffect } from 'react';

interface AvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: string;
  fontSize?: string;
}

export function Avatar({ photoUrl, name, size = '40px', fontSize = '16px' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(photoUrl);

  // If photoUrl changes from outside, reset error state
  useEffect(() => {
    setCurrentUrl(photoUrl);
    setImageError(false);
  }, [photoUrl]);

  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const showImage = currentUrl && !imageError;

  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        backgroundColor: '#cbd5e1', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden',
        flexShrink: 0
      }}
      title={name}
    >
      {showImage ? (
        <img 
          src={currentUrl} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          onError={() => setImageError(true)}
        />
      ) : (
        <span style={{ fontSize: fontSize, color: '#fff', fontWeight: 600, letterSpacing: '1px' }}>
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
