export function OrgChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <rect x="2" y="17" width="6" height="4" rx="1" />
      <rect x="16" y="17" width="6" height="4" rx="1" />
      <path d="M12 7v5" />
      <path d="M5 12h14" />
      <path d="M5 12v5" />
      <path d="M19 12v5" />
    </svg>
  );
}
