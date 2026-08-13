import type { SVGAttributes } from 'react';

export type LogoProps = SVGAttributes<SVGSVGElement>;

export const BrandingLogo = (props: LogoProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 48" role="img" aria-label="Plane Contracts" {...props}>
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
      <path d="M8 4h23l9 9v31H8z" />
      <path d="M31 4v10h9M14 34c5-7 8 5 13-2 3-4 5 1 8-1" />
    </g>
    <text x="52" y="31" fill="currentColor" fontFamily="Inter, ui-sans-serif, system-ui" fontSize="21" fontWeight="600">
      Plane Contracts
    </text>
  </svg>
);
