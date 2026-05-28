import { FC } from 'react'

export interface QuestionProps {
  text: string
  id?: string
  className?: string
}

/**
 * Renders the prompt text for a checkpoint question.
 *
 * Presentational only — does not own selection state or submit logic; that
 * lives in the parent overlay. Uses a semantic `<h3>` so screen readers
 * announce the question as a heading inside the overlay's dialog, and so
 * an ancestor can wire `aria-labelledby` to the optional `id` prop.
 */
const Question: FC<QuestionProps> = ({ text, id, className }) => {
  return (
    <h3
      id={id}
      className={`
        text-xl md:text-2xl
        font-semibold text-gray-900
        mb-6
        leading-relaxed
        ${className || ''}
      `}
    >
      {text}
    </h3>
  )
}

export default Question
