import { FC } from 'react'

export interface AnswerButtonProps {
  label: string
  text: string
  index: number
  isSelected: boolean
  onSelect: (index: number) => void
  disabled: boolean
  className?: string
}

/**
 * A single selectable answer choice within a checkpoint question.
 *
 * Visual states:
 * - **Idle**: dark gray background, light gray text, subtle hover scale and
 *   background lift.
 * - **Selected** (`isSelected`): blue background, white text, scaled up
 *   (`scale-105`) with a shadow to signal commitment. Driven by the
 *   parent — this component never toggles selection on its own.
 * - **Disabled** (`disabled`): reduced opacity, `not-allowed` cursor, no
 *   hover effects. Set by the parent after a choice is submitted to
 *   prevent double-taps from registering as a second answer.
 *
 * The button always renders the letter label (A/B/C/D) in a fixed-size
 * badge so option columns line up visually regardless of answer length.
 *
 * Accessibility: native `<button>` (keyboard-focusable, Enter/Space
 * activates), `aria-label` combines the letter and answer text so screen
 * readers announce "Answer B: <text>" instead of just the visible glyph,
 * and a 2px blue focus ring shows the keyboard focus position.
 */
const AnswerButton: FC<AnswerButtonProps> = ({
  label,
  text,
  index,
  isSelected,
  onSelect,
  disabled,
  className,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onSelect(index)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Answer ${label}: ${text}`}
      aria-pressed={isSelected}
      className={`
        min-h-[50px] md:min-h-[60px]
        px-6 py-4
        rounded-lg text-left
        transition-all duration-200
        font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${
          isSelected
            ? 'bg-blue-600 text-white scale-105 shadow-lg'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:scale-[1.02]'
        }
        ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
        ${className || ''}
      `}
    >
      <div className="flex items-start gap-3">
        <span
            className="
            flex-shrink-0
            w-6 h-6
            flex items-center justify-center
            bg-gray-200 text-gray-700
            rounded text-sm font-bold
          "
          aria-hidden="true"
        >
          {label}
        </span>

        <span className="flex-1">{text}</span>
      </div>
    </button>
  )
}

export default AnswerButton
