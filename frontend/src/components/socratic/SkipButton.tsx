import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { SkipReason } from '@/services/socraticApi'

interface SkipButtonProps {
  concept: string
  stepAtSkip: number
  onSkip: (reason: SkipReason | null) => void
}

const SKIP_OPTIONS: { reason: SkipReason; label: string }[] = [
  { reason: 'time', label: "I'm short on time" },
  { reason: 'overwhelmed', label: 'Feeling overwhelmed' },
  { reason: 'no_clue', label: "Not sure where to start" },
  { reason: 'other', label: 'Other' },
]

export default function SkipButton({ onSkip }: SkipButtonProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (reason: SkipReason | null) => {
    setOpen(false)
    onSkip(reason)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ color: '#6b5fa8' }}
        >
          Skip to full explanation
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-xl shadow-xl p-5"
          style={{ backgroundColor: 'white', border: '1px solid #AFA9EC' }}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="font-semibold text-sm" style={{ color: '#3C3489' }}>
              Why are you skipping?
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-2">
            {SKIP_OPTIONS.map(({ reason, label }) => (
              <button
                key={reason}
                onClick={() => handleSelect(reason)}
                className="text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-purple-50"
                style={{ color: '#3C3489', border: '1px solid #AFA9EC' }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSelect('dismissed')}
            className="mt-3 w-full text-xs text-center transition-opacity hover:opacity-70"
            style={{ color: '#6b5fa8' }}
          >
            Dismiss without reason
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
