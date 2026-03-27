import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

interface ConceptNodeProps {
  data: {
    label: string
    level?: string
    definition?: string
  }
}

function ConceptNode({ data }: ConceptNodeProps) {
  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'Beginner':
        return 'border-green-500 bg-green-50'
      case 'Intermediate':
        return 'border-amber-500 bg-amber-50'
      case 'Advanced':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-300 bg-white'
    }
  }

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow min-w-[120px] max-w-[180px] ${getLevelColor(data.level)}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="text-sm font-medium text-gray-900 text-center truncate">
        {data.label}
      </div>
      {data.level && (
        <div className="text-xs text-gray-500 text-center mt-1">
          {data.level}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

export default memo(ConceptNode)
