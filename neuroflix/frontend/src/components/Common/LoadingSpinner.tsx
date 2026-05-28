import { FC } from 'react'

/**
 * LoadingSpinner - A reusable animated loading spinner component.
 *
 * Size options:
 *  - 'sm': 32px (w-8 h-8) with 2px border
 *  - 'md': 48px (w-12 h-12) with 3px border (default)
 *  - 'lg': 64px (w-16 h-16) with 4px border
 *  - 'xl': 96px (w-24 h-24) with 4px border
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" />
 * <LoadingSpinner fullScreen />
 */
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'w-8 h-8 border-2',
  md: 'w-12 h-12 border-3',
  lg: 'w-16 h-16 border-4',
  xl: 'w-24 h-24 border-4',
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  fullScreen = false,
}) => {
  const spinner = (
    <div
      className={`
        ${sizeClasses[size || 'md']}
        border-white border-t-transparent
        rounded-full
        animate-spin
        ${className || ''}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner
