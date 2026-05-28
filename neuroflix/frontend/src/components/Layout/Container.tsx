import type { FC, ReactNode } from 'react';

export interface ContainerProps {
  /** Content rendered inside the centered, padded container. */
  children: ReactNode;
  /** Extra Tailwind classes appended after the defaults. */
  className?: string;
  /** Tailwind `max-w-*` token controlling the outer width. Defaults to `7xl`. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
};

/**
 * Centered, responsively-padded wrapper for page content.
 *
 * Provides a consistent horizontal rhythm across pages by capping width with
 * a Tailwind `max-w-*` token and applying responsive horizontal padding
 * (`px-4` → `sm:px-6` → `lg:px-8`). Use it at the top of a page or section
 * so children share the same gutters as the {@link Header} and
 * {@link Footer}.
 *
 * @example
 * ```tsx
 * <Container maxWidth="2xl" className="py-8">
 *   <h1>Settings</h1>
 *   <SettingsForm />
 * </Container>
 * ```
 */
const Container: FC<ContainerProps> = ({ children, className, maxWidth }) => {
  return (
    <div
      className={`
        ${maxWidthClasses[maxWidth || '7xl']}
        mx-auto px-4 sm:px-6 lg:px-8
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
};

export default Container;
