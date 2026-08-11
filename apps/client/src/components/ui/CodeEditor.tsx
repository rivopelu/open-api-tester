import MonacoEditor, { type BeforeMount } from '@monaco-editor/react'
import { Braces } from 'lucide-react'
import { cn } from '../../lib/utils'

const configureJson: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('max-api-studio', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '89B4FA' },
      { token: 'string.value.json', foreground: 'A6E3A1' },
      { token: 'number', foreground: 'F9E2AF' },
      { token: 'keyword', foreground: 'CBA6F7' },
      { token: 'delimiter.bracket.json', foreground: 'CDD6F4' },
    ],
    colors: {
      'editor.background': '#11111B',
      'editor.foreground': '#CDD6F4',
      'editorLineNumber.foreground': '#585B70',
      'editorLineNumber.activeForeground': '#89B4FA',
      'editorCursor.foreground': '#89B4FA',
      'editor.selectionBackground': '#45475A99',
      'editor.inactiveSelectionBackground': '#31324488',
      'editor.lineHighlightBackground': '#181825',
      'editorLineNumber.dimmedForeground': '#45475A',
      'editorIndentGuide.background1': '#313244',
      'editorIndentGuide.activeBackground1': '#585B70',
      'editorBracketMatch.background': '#89B4FA22',
      'editorBracketMatch.border': '#89B4FA',
      'editorError.foreground': '#F38BA8',
      'editorWarning.foreground': '#F9E2AF',
      'editorWidget.background': '#1E1E2E',
      'editorWidget.border': '#313244',
      'editorHoverWidget.background': '#24273A',
      'editorHoverWidget.border': '#313244',
      'input.background': '#181825',
      'input.border': '#313244',
      'focusBorder': '#89B4FA',
      'scrollbarSlider.background': '#45475A66',
      'scrollbarSlider.hoverBackground': '#585B7088',
      'scrollbarSlider.activeBackground': '#6C7086AA',
    },
  })
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    trailingCommas: 'error',
  })
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function CodeEditor({ value, onChange, label = 'JSON', className }: CodeEditorProps) {
  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden bg-base', className)}>
      <div className="flex h-9 shrink-0 items-center border-b border-border bg-overlay px-3">
        <Braces className="mr-2 h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">{label}</span>
        <span className="ml-auto text-[10px] text-text-muted">JSON · 2 spaces</span>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language="json"
          theme="max-api-studio"
          value={value}
          beforeMount={configureJson}
          onChange={(next) => onChange(next ?? '')}
          options={{
            automaticLayout: true,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 12,
            lineHeight: 20,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            folding: true,
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            stickyScroll: { enabled: false },
          }}
        />
      </div>
    </div>
  )
}
