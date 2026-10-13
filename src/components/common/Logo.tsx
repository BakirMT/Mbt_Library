import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtext?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "w-10 h-10", 
  size = 40,
  showText = false,
  subtext = "Multi-Tenant Library System"
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Laptop Base Outline */}
          <path d="M15 82H85C88.3 82 91 79.3 91 76V74C91 71.8 89.2 70 87 70H13C10.8 70 9 71.8 9 74V76C9 79.3 11.7 82 15 82Z" fill="#1e3a8a" />
          <path d="M42 82H58V84C58 85.1 57.1 86 56 86H44C42.9 86 42 85.1 42 82Z" fill="#0f172a" />

          {/* Laptop Screen / Outer Frame Arc */}
          <path d="M22 68V30C22 24.5 26.5 20 32 20H68C73.5 20 78 24.5 78 30V68" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />

          {/* Book Spines behind */}
          {/* Green Spine */}
          <rect x="36" y="26" width="10" height="32" rx="3" fill="#10b981" />
          <rect x="38" y="30" width="6" height="2" fill="#065f46" />
          <rect x="38" y="35" width="6" height="2" fill="#065f46" />

          {/* Blue Spine (Taller) */}
          <rect x="48" y="20" width="12" height="38" rx="3" fill="#2563eb" />
          <rect x="51" y="25" width="6" height="2" fill="#1e3a8a" />
          <rect x="51" y="30" width="6" height="2" fill="#1e3a8a" />

          {/* Orange Spine with character face */}
          <rect x="62" y="24" width="10" height="34" rx="3" fill="#f59e0b" />
          <rect x="65" y="28" width="2" height="2" fill="#78350f" />
          <rect x="68" y="28" width="2" height="2" fill="#78350f" />
          <rect x="65" y="34" width="4" height="2" rx="1" fill="#78350f" />

          {/* Open Book Pages (Vibrant Blue) */}
          <path d="M12 48C24 44 38 48 50 58C62 48 76 44 88 48V72C76 66 62 68 50 78C38 68 24 66 12 72V48Z" fill="#3b82f6" />
          <path d="M50 58C38 48 24 44 12 48V72C24 66 38 68 50 78V58Z" fill="#2563eb" />
          
          {/* Page Center Spine shadow */}
          <path d="M49 58V78C50 78 51 78 52 78V58C51 58 50 58 49 58Z" fill="#1d4ed8" />

          {/* Orange Bookmark Ribbon */}
          <path d="M74 54H82V76L78 72L74 76V54Z" fill="#f59e0b" />
        </svg>
      </div>

      {showText && (
        <div>
          <div className="font-black text-lg tracking-tight flex items-center space-x-1.5 text-white">
            <span>MBT Library</span>
            <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">SaaS</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">{subtext}</p>
        </div>
      )}
    </div>
  );
};
