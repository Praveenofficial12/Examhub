import React, { useState } from 'react';
import vsbLogoPicture from '../assets/images/vsbec_logo.jpg';

interface OfficialEmblemProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  className?: string;
}

export const OfficialEmblem: React.FC<OfficialEmblemProps> = ({
  size = 'md',
  showText = false,
  className = ''
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeMap = {
    xs: 'w-9 h-9',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`relative ${
          className.includes('w-full') ? 'w-full h-full' : sizeMap[size]
        } shrink-0 select-none flex items-center justify-center aspect-square`}
      >
        {!imgFailed ? (
          <img
            src={vsbLogoPicture || '/vsbec_logo.png'}
            alt="V.S.B. Engineering College Emblem"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain select-none pointer-events-none"
          />
        ) : (
          /* High-Precision Direct Vector Crest SVG Fallback */
          <svg
            viewBox="0 0 500 500"
            className="w-full h-full drop-shadow-sm transition-transform duration-300"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="vsbSealGold" cx="50%" cy="45%" r="50%">
                <stop offset="0%" stopColor="#FFF777" />
                <stop offset="60%" stopColor="#FFD300" />
                <stop offset="100%" stopColor="#F5B400" />
              </radialGradient>
              <linearGradient id="vsbCogRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E61212" />
                <stop offset="60%" stopColor="#C90A0A" />
                <stop offset="100%" stopColor="#960000" />
              </linearGradient>
              <linearGradient id="vsbRibbonGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF98A" />
                <stop offset="50%" stopColor="#FFD300" />
                <stop offset="100%" stopColor="#EAA300" />
              </linearGradient>
              <path id="collegeNameArcFallback" d="M 85,215 A 165,165 0 1,1 415,215" fill="none" />
            </defs>

            {/* Circular Base */}
            <circle cx="250" cy="215" r="185" fill="url(#vsbSealGold)" stroke="#D4111E" strokeWidth="5" />
            <circle cx="250" cy="215" r="177" fill="none" stroke="#D4111E" strokeWidth="2" />
            <circle cx="250" cy="215" r="150" fill="none" stroke="#D4111E" strokeWidth="2" />

            {/* Top Arched Institution Text */}
            <text fontSize="25.5" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" fill="#C90A0A" letterSpacing="3.5">
              <textPath href="#collegeNameArcFallback" startOffset="50%" textAnchor="middle">
                V.S.B. ENGINEERING COLLEGE
              </textPath>
            </text>

            {/* Left & Right Diyas */}
            <g transform="translate(68, 185) scale(0.8)">
              <path d="M12,25 C12,42 46,42 46,25 C41,28 17,28 12,25 Z" fill="#C90A0A" stroke="#960000" strokeWidth="1.5" />
              <path d="M29,22 C33,12 26,6 29,0 C33,6 26,12 29,22 Z" fill="#E61212" />
              <circle cx="29" cy="9" r="4" fill="#FFF777" />
            </g>
            <g transform="translate(390, 185) scale(0.8)">
              <path d="M12,25 C12,42 46,42 46,25 C41,28 17,28 12,25 Z" fill="#C90A0A" stroke="#960000" strokeWidth="1.5" />
              <path d="M29,22 C33,12 26,6 29,0 C33,6 26,12 29,22 Z" fill="#E61212" />
              <circle cx="29" cy="9" r="4" fill="#FFF777" />
            </g>

            {/* Laurel Branches */}
            <g stroke="#C90A0A" strokeWidth="1.8" fill="#FFF777">
              <path d="M96,250 C112,282 150,314 212,328" fill="none" stroke="#C90A0A" strokeWidth="2.5" />
              <path d="M102,254 Q116,248 124,260 Q110,268 102,254" />
              <path d="M120,270 Q136,266 142,280 Q126,286 120,270" />
              <path d="M144,290 Q160,286 166,300 Q150,306 144,290" />
              <path d="M172,308 Q188,306 192,320 Q176,324 172,308" />

              <path d="M404,250 C388,282 350,314 288,328" fill="none" stroke="#C90A0A" strokeWidth="2.5" />
              <path d="M398,254 Q384,248 376,260 Q390,268 398,254" />
              <path d="M380,270 Q364,266 358,280 Q374,286 380,270" />
              <path d="M356,290 Q340,286 334,300 Q350,306 356,290" />
              <path d="M328,308 Q312,306 308,320 Q324,324 328,308" />
            </g>

            {/* Center Cogwheel & 3 Sectors */}
            <g transform="translate(250, 212)">
              {[...Array(12)].map((_, i) => (
                <path
                  key={i}
                  d="M-18,-115 L18,-115 L22,-90 L-22,-90 Z"
                  fill="url(#vsbCogRed)"
                  stroke="#960000"
                  strokeWidth="1.5"
                  transform={`rotate(${i * 30})`}
                />
              ))}
              <circle cx="0" cy="0" r="95" fill="url(#vsbCogRed)" stroke="#960000" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="74" fill="#FFFFFF" stroke="#D4111E" strokeWidth="3.5" />
              <line x1="0" y1="0" x2="0" y2="-74" stroke="#D4111E" strokeWidth="3" />
              <line x1="0" y1="0" x2="-64" y2="37" stroke="#D4111E" strokeWidth="3" />
              <line x1="0" y1="0" x2="64" y2="37" stroke="#D4111E" strokeWidth="3" />

              {/* PC */}
              <g transform="translate(-32, -34) scale(0.55)">
                <rect x="-30" y="-25" width="60" height="46" rx="4" fill="#FFFFFF" stroke="#D4111E" strokeWidth="3" />
                <rect x="-23" y="-18" width="46" height="32" rx="2" fill="#F8FAFC" stroke="#D4111E" strokeWidth="2" />
                <path d="M-8,21 L8,21 L12,28 L-12,28 Z" fill="#D4111E" />
                <polygon points="-32,30 32,30 27,42 -27,42" fill="#FFFFFF" stroke="#D4111E" strokeWidth="2.5" />
                <line x1="-22" y1="34" x2="22" y2="34" stroke="#D4111E" strokeWidth="2" strokeDasharray="3 2" />
              </g>

              {/* Pylon */}
              <g transform="translate(32, -34) scale(0.55)">
                <polygon points="0,-32 -22,44 22,44" fill="none" stroke="#D4111E" strokeWidth="3" />
                <line x1="-30" y1="-8" x2="30" y2="-8" stroke="#D4111E" strokeWidth="3" />
                <line x1="-22" y1="14" x2="22" y2="14" stroke="#D4111E" strokeWidth="2.5" />
                <line x1="-15" y1="-32" x2="15" y2="44" stroke="#D4111E" strokeWidth="2.5" />
                <line x1="15" y1="-32" x2="-15" y2="44" stroke="#D4111E" strokeWidth="2.5" />
              </g>

              {/* Dish */}
              <g transform="translate(0, 36) scale(0.52)">
                <ellipse cx="0" cy="-10" rx="34" ry="17" fill="#FFFFFF" stroke="#D4111E" strokeWidth="3" transform="rotate(-15)" />
                <line x1="-3" y1="-10" x2="-22" y2="-30" stroke="#D4111E" strokeWidth="3" />
                <circle cx="-22" cy="-30" r="5" fill="#D4111E" />
                <path d="M-8,5 L8,5 L15,22 L-15,22 Z" fill="#D4111E" />
                <rect x="-22" y="22" width="44" height="6" rx="2" fill="#D4111E" />
              </g>
            </g>

            {/* City */}
            <text x="250" y="334" textAnchor="middle" fontSize="17.5" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" fill="#C90A0A" letterSpacing="1.8">
              KARUR - 639 111
            </text>

            {/* Motto Ribbon */}
            <g transform="translate(0, 5)">
              <polygon points="62,365 28,365 52,388 28,412 62,412 85,388" fill="#EAA300" stroke="#D4111E" strokeWidth="2" />
              <polygon points="438,365 472,365 448,388 472,412 438,412 415,388" fill="#EAA300" stroke="#D4111E" strokeWidth="2" />
              <path d="M 68,365 Q 250,408 432,365 L 432,410 Q 250,453 68,410 Z" fill="url(#vsbRibbonGold)" stroke="#D4111E" strokeWidth="3.2" />
              <text x="250" y="402" textAnchor="middle" fontSize="16.5" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" fill="#C90A0A" letterSpacing="1.2">
                ★ HARDWORK IS THE KEY TO SUCCESS ★
              </text>
            </g>
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-widest font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Autonomous Institution
            </span>
            <span className="text-xs text-slate-400 font-mono">Anna Univ Affiliated</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-sans mt-0.5">
            V.S.B. ENGINEERING COLLEGE
          </h1>
          <p className="text-xs text-amber-300/90 font-medium">
            Office of the Controller of Examinations (COE) • Karur - 639 111
          </p>
        </div>
      )}
    </div>
  );
};
