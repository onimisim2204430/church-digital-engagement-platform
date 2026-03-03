/**
 * Icon Component
 * Reusable wrapper for react-icons with Material Symbol names
 * Replaces material-symbols-outlined usage throughout the app
 */

import React, { memo } from 'react';
import { iconMapping } from './iconMapping';

interface IconProps {
  /** Material icon name (e.g., 'arrow_forward', 'menu') */
  name: string;
  /** Size in pixels (default: 24) */
  size?: number | string;
  /** CSS class names to apply */
  className?: string;
  /** Color of the icon (default: currentColor) */
  color?: string;
  /** Title/tooltip for the icon */
  title?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Whether icon is decorative (aria-hidden) */
  ariaHidden?: boolean;
  /** Click handler */
  onClick?: (e: React.MouseEvent<SVGElement>) => void;
  /** Additional style properties */
  style?: React.CSSProperties;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Icon Component - Maps Material symbol names to react-icons
 * Usage: <Icon name="arrow_forward" size={24} />
 */
const Icon = memo<IconProps>(({
  name,
  size = 24,
  className = '',
  color = 'currentColor',
  title,
  ariaLabel,
  ariaHidden,
  onClick,
  style,
  'data-testid': testId,
}) => {
  const IconComponent = iconMapping[name];

  if (!IconComponent) {
    console.warn(`Icon name "${name}" not found in icon mapping`);
    return null;
  }

  const sizeValue = typeof size === 'number' ? size : parseInt(size, 10);

  return (
    <IconComponent
      size={sizeValue}
      color={color}
      className={className}
      title={title}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      data-testid={testId}
    />
  );
});

Icon.displayName = 'Icon';

export default Icon;
