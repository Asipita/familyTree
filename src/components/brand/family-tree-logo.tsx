type FamilyTreeLogoProps = {
  size?: number;
  className?: string;
};

/** A compact geometric family constellation: three forms joined by branching lines. */
export function FamilyTreeLogo({ size = 38, className = "" }: FamilyTreeLogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="10 4 44 38"
      width={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 34 21 24M32 34l11-11"
        className="family-tree-logo-branch"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path d="m32 7 8 8-8 8-8-8 8-8Z" className="family-tree-logo-parent" fill="currentColor" />
      <path d="m21 16 7 7-7 7-7-7 7-7Z" className="family-tree-logo-child" fill="currentColor" />
      <path d="m43 16 7 7-7 7-7-7 7-7Z" className="family-tree-logo-child" fill="currentColor" />
      <path d="m32 28 5 5-5 5-5-5 5-5Z" className="family-tree-logo-heart" fill="currentColor" />
    </svg>
  );
}
