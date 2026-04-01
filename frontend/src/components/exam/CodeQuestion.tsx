import Editor from '@monaco-editor/react'

const STARTER = `// Write your C# solution here\npublic class Solution {\n    // TODO\n}\n`

interface CodeQuestionProps {
  value: string
  onChange: (v: string) => void
  submitted: boolean
}

export default function CodeQuestion({ value, onChange, submitted }: CodeQuestionProps) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span style={{ color: '#a78bfa' }}>C#</span>
        <span>solution.cs</span>
      </div>
      <Editor
        height="260px"
        language="csharp"
        theme="vs-dark"
        value={value || STARTER}
        onChange={v => !submitted && onChange(v ?? '')}
        options={{
          readOnly: submitted,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          tabSize: 4,
        }}
      />
    </div>
  )
}
