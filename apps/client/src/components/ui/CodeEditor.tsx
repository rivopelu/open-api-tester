import MonacoEditor, { type BeforeMount } from '@monaco-editor/react'
import { Braces } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useThemeStore } from '../../store/useThemeStore'

const configureThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('max-api-studio-dark', {
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
  monaco.editor.defineTheme('max-api-studio-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '1E66F5' },
      { token: 'string.value.json', foreground: '40A02B' },
      { token: 'number', foreground: 'DF8E1D' },
      { token: 'keyword', foreground: '8839EF' },
      { token: 'delimiter.bracket.json', foreground: '4C4F69' },
    ],
    colors: {
      'editor.background': '#EFF1F5',
      'editor.foreground': '#4C4F69',
      'editorLineNumber.foreground': '#8C8FA1',
      'editorLineNumber.activeForeground': '#1E66F5',
      'editorCursor.foreground': '#1E66F5',
      'editor.selectionBackground': '#ACB0BE66',
      'editor.inactiveSelectionBackground': '#CCD0DA88',
      'editor.lineHighlightBackground': '#E6E9EF',
      'editorLineNumber.dimmedForeground': '#CCD0DA',
      'editorIndentGuide.background1': '#CCD0DA',
      'editorIndentGuide.activeBackground1': '#8C8FA1',
      'editorBracketMatch.background': '#1E66F522',
      'editorBracketMatch.border': '#1E66F5',
      'editorError.foreground': '#D20F39',
      'editorWarning.foreground': '#DF8E1D',
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#CCD0DA',
      'editorHoverWidget.background': '#F2F4F8',
      'editorHoverWidget.border': '#CCD0DA',
      'input.background': '#E6E9EF',
      'input.border': '#CCD0DA',
      'focusBorder': '#1E66F5',
      'scrollbarSlider.background': '#8C8FA144',
      'scrollbarSlider.hoverBackground': '#8C8FA166',
      'scrollbarSlider.activeBackground': '#8C8FA188',
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
  language?: 'json' | 'markdown'
  readOnly?: boolean
}

const languageMeta: Record<'json' | 'markdown', { hint: string; formatOnType: boolean }> = {
  json: { hint: 'JSON · 2 spaces', formatOnType: true },
  markdown: { hint: 'Markdown', formatOnType: false },
}

export function CodeEditor({ value, onChange, label = 'JSON', className, language = 'json', readOnly = false }: CodeEditorProps) {
  const meta = languageMeta[language]
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden bg-base', className)}>
      <div className="flex h-9 shrink-0 items-center border-b border-border bg-overlay px-3">
        <Braces className="mr-2 h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">{label}</span>
        <span className="ml-auto text-[10px] text-text-muted">{meta.hint}</span>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          theme={resolvedTheme === 'light' ? 'max-api-studio-light' : 'max-api-studio-dark'}
          value={value}
          beforeMount={configureThemes}
          onChange={(next) => onChange(next ?? '')}
          options={{
            readOnly,
            automaticLayout: true,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 12,
            lineHeight: 20,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            folding: true,
            formatOnPaste: language === 'json',
            formatOnType: meta.formatOnType,
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
