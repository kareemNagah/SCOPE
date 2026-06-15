export function ScopeLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.svg"
        alt="SCOPE"
        className="h-12 w-auto object-contain"
      />
    </div>
  );
}



