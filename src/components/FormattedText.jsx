import React from 'react';

/**
 * A lightweight utility component to render simple markdown-like formatting
 * (bolding and bullet points) without full markdown library overhead.
 * Handles patterns like * **"Bold":** or simply **Bold**.
 */
const FormattedText = ({ text, style, bulletColor = 'var(--red)', textColor = 'inherit', boldColor = 'var(--tp)' }) => {
  if (!text) return null;

  const lines = text.split('\n').filter(l => l.trim());

  return (
    <div style={{ ...style, color: textColor }}>
      {lines.map((line, i) => {
        let clean = line.trim();
        let isBullet = false;

        // Detect and remove common markdown bullets
        if (clean.startsWith('* ')) {
          clean = clean.substring(2);
          isBullet = true;
        } else if (clean.startsWith('- ')) {
          clean = clean.substring(2);
          isBullet = true;
        }

        // Split by markdown bold markers **text**
        const parts = clean.split(/(\*\*.*?\*\*)/g);

        return (
          <div 
            key={i} 
            style={{ 
              display: 'flex', 
              gap: isBullet ? 10 : 0, 
              marginBottom: i < lines.length - 1 ? 10 : 0,
              alignItems: 'flex-start'
            }}
          >
            {isBullet && (
              <span style={{ color: bulletColor, fontWeight: 900, flexShrink: 0 }}>•</span>
            )}
            <span>
              {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const content = part.slice(2, -2);
                  return (
                    <strong key={j} style={{ color: boldColor, fontWeight: 800 }}>
                      {content}
                    </strong>
                  );
                }
                return part;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FormattedText;
