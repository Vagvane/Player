import { FC, useState, useEffect, useRef } from 'react'
import Question from './Question'
import AnswerOptions from './AnswerOptions'
import type { Checkpoint } from '../../types/checkpoint'

export interface QuestionOverlayProps {
  checkpoint: Checkpoint
  onAnswer: (answerIndex: number) => Promise<void>
  isSubmitting?: boolean
  submitError?: string | null
  wrongAnswer?: boolean
  visible?: boolean
  className?: string
}

const QuestionOverlay: FC<QuestionOverlayProps> = ({
  checkpoint,
  onAnswer,
  isSubmitting = false,
  submitError = null,
  wrongAnswer = false,
  visible = true,
  className,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [wasCorrect, setWasCorrect] = useState(false)

  // Track the previous isSubmitting value to detect the true→false transition.
  const prevIsSubmitting = useRef(isSubmitting)

  // Reset local state whenever a fresh question appears.
  useEffect(() => {
    setSelectedAnswer(null)
    setIsPending(false)
    setWasCorrect(false)
  }, [checkpoint.id])

  // When the server confirms a wrong answer, deselect so the viewer
  // can immediately pick a different option without extra clicks.
  useEffect(() => {
    if (wrongAnswer) {
      setSelectedAnswer(null)
      setWasCorrect(false)
    }
  }, [wrongAnswer])

  // Detect a correct answer: isSubmitting transitions true→false with no
  // wrongAnswer or submitError — the parent will now start fading the overlay.
  useEffect(() => {
    if (
      prevIsSubmitting.current === true &&
      !isSubmitting &&
      !wrongAnswer &&
      !submitError
    ) {
      setWasCorrect(true)
    }
    prevIsSubmitting.current = isSubmitting
  }, [isSubmitting, wrongAnswer, submitError])

  // While showing the correct-answer banner, lock the answer buttons so the
  // viewer can't submit again during the 2-second dismissal window.
  const isDisabled = isPending || isSubmitting || wasCorrect

  const handleSelect = (index: number) => {
    if (isDisabled) return
    setSelectedAnswer(index)
    setIsPending(true)
    setTimeout(() => {
      setIsPending(false)
      void onAnswer(index)
    }, 500)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`checkpoint-question-${checkpoint.id}`}
      className={`
        absolute inset-0 z-40
        flex items-center justify-center
        bg-black/80 backdrop-blur-sm
        transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0'}
        ${className || ''}
      `}
    >
      <div className="
        bg-white border border-gray-200 rounded-xl
        p-6 md:p-8
        max-w-2xl w-full mx-4
        shadow-2xl
      ">
        <Question
          id={`checkpoint-question-${checkpoint.id}`}
          text={checkpoint.question}
        />

        <AnswerOptions
          options={checkpoint.options}
          selectedAnswer={selectedAnswer}
          onSelect={handleSelect}
          disabled={isDisabled}
        />

        {/* Correct answer banner — shown for ~2 s before the overlay fades out */}
        {wasCorrect && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm font-semibold text-green-700">✓ Correct!</p>
            {checkpoint.explanation && (
              <p className="mt-1 text-sm text-green-800">{checkpoint.explanation}</p>
            )}
          </div>
        )}

        {/* Wrong answer — must retry with a different choice */}
        {wrongAnswer && !isSubmitting && !isPending && (
          <p className="mt-4 text-center text-sm font-medium text-red-500">
            Incorrect — please try again. You must choose the correct answer to continue.
          </p>
        )}

        {/* Network/API failure — distinct from a wrong answer */}
        {submitError && !wrongAnswer && !isSubmitting && !isPending && (
          <p className="mt-4 text-center text-sm text-red-500">
            Submission failed — please select your answer again to retry.
          </p>
        )}
      </div>
    </div>
  )
}

export default QuestionOverlay
