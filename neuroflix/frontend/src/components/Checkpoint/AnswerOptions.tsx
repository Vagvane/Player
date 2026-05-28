import { FC } from 'react'
import AnswerButton from './AnswerButton'

export interface AnswerOptionsProps {
  options: [string, string, string, string]
  selectedAnswer: number | null
  onSelect: (index: number) => void
  disabled: boolean
  className?: string
}

const LABELS = ['A', 'B', 'C', 'D'] as const

/**
 * Renders the four answer choices for a checkpoint question as a
 * responsive grid of `AnswerButton`s.
 *
 * Presentational/stateless: selection state and submission gating are
 * owned by the parent overlay and passed in via `selectedAnswer` and
 * `disabled`. The component fans those props out to each button along
 * with a static A/B/C/D label so option ordering matches `options`.
 *
 * Layout: single column on mobile, two columns from the `md` breakpoint
 * (768px) up. Each button is independently focusable so Tab/Enter
 * keyboard navigation works without extra wiring.
 */
const AnswerOptions: FC<AnswerOptionsProps> = ({
  options,
  selectedAnswer,
  onSelect,
  disabled,
  className,
}) => {
  return (
    <div
      className={`
        grid grid-cols-1 md:grid-cols-2 gap-4
        ${className || ''}
      `}
    >
      {options.map((option, index) => (
        <AnswerButton
          key={index}
          label={LABELS[index]}
          text={option}
          index={index}
          isSelected={selectedAnswer === index}
          onSelect={onSelect}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

export default AnswerOptions
