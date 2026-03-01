import React, { useState, useEffect, useRef } from 'react'
import { useWsStore } from '../hooks/useWs'
import { ChevronUp, ChevronDown, Trash2, Copy, Clock, ArrowUpRight, ArrowDownLeft, Brain, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { analyzeWsMessage } from '@/lib/ai-agents'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const RealtimeClientServerLogsTable = () => {
  const { messages, clearMessages } = useWsStore()
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(-1)
  const [analyzingIndex, setAnalyzingIndex] = useState<number>(-1)
  const [analysisResults, setAnalysisResults] = useState<Record<number, any>>({})
  const tableRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const { url } = useWsStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && selectedMessageIndex === -1) {
      scrollToBottom()
    }
  }, [messages.length])

  // Update row refs array when messages change
  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, messages.length)
  }, [messages.length])

  const scrollToBottom = () => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight
    }
  }

  const scrollToRow = (index: number) => {
    const row = rowRefs.current[index]
    if (row && tableRef.current) {
      const containerRect = tableRef.current.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()

      if (rowRect.top < containerRect.top || rowRect.bottom > containerRect.bottom) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleNavigateUp = () => {
    if (messages.length === 0) return

    const newIndex = selectedMessageIndex === -1
      ? messages.length - 1
      : Math.max(0, selectedMessageIndex - 1)

    setSelectedMessageIndex(newIndex)
    scrollToRow(newIndex)
  }

  const handleNavigateDown = () => {
    if (messages.length === 0) return

    const newIndex = selectedMessageIndex === -1
      ? 0
      : selectedMessageIndex + 1 < messages.length
        ? selectedMessageIndex + 1
        : -1

    setSelectedMessageIndex(newIndex)

    if (newIndex === -1) {
      scrollToBottom()
    } else {
      scrollToRow(newIndex)
    }
  }

  const handleRowClick = (index: number) => {
    setSelectedMessageIndex(selectedMessageIndex === index ? -1 : index)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy: ', err)
    })
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    }).format(timestamp)
  }

  const formatMessageData = (data: string) => {
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2)
      } catch {
        return data
      }
    }
    return JSON.stringify(data, null, 2)
  }

  const getMessageTypeIcon = (type: 'sent' | 'received') => {
    return type === 'sent'
      ? <ArrowUpRight size={16} className="text-blue-400" />
      : <ArrowDownLeft size={16} className="text-green-400" />
  }

  const handleAnalyze = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const message = messages[index]
    if (!message || !url) return

    setAnalyzingIndex(index)
    try {
      const result = await analyzeWsMessage({
        type: message.type,
        data: typeof message.data === 'string' ? message.data : JSON.stringify(message.data),
        url: url
      })

      if (result.success) {
        setAnalysisResults(prev => ({ ...prev, [index]: result.data }))
        toast.success('Analysis complete!')
      } else {
        toast.error('AI Analysis failed')
      }
    } catch (error) {
      toast.error('An error occurred during analysis')
    } finally {
      setAnalyzingIndex(-1)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-zinc-400" />
          <h3 className="text-white font-medium">Message Logs</h3>
          <span className="text-xs text-zinc-500">({messages.length} messages)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateUp}
            disabled={messages.length === 0}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
            title="Navigate up (previous message)"
          >
            <ChevronUp size={16} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateDown}
            disabled={messages.length === 0}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
            title="Navigate down (next message)"
          >
            <ChevronDown size={16} />
          </Button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />

          {/* Clear messages */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={messages.length === 0}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-zinc-700"
            title="Clear all messages"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Messages Table */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            No messages yet. Connect to a WebSocket to see message logs.
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {messages.map((message, index) => (
              <div
                key={message.id}
                ref={(el) => { rowRefs.current[index] = el; }}
                className={`
                  border-l-4 rounded-r-md p-3 cursor-pointer transition-all duration-200
               
                  ${selectedMessageIndex === index
                    ? 'ring-2 ring-zinc-400 bg-zinc-800/50'
                    : 'hover:bg-zinc-800/30'
                  }
                `}
                onClick={() => handleRowClick(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMessageTypeIcon(message.type)}
                    <span className={`text-sm font-medium capitalize ${message.type === 'sent' ? 'text-blue-300' : 'text-green-300'
                      }`}>
                      {message.type}
                    </span>
                    <span className="text-xs text-zinc-500">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleAnalyze(index, e)}
                      disabled={analyzingIndex === index}
                      className={`h-6 w-6 p-0 ${analysisResults[index] ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-400'}`}
                      title="AI Explain Message"
                    >
                      {analyzingIndex === index ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Brain size={12} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(message.raw || formatMessageData(message.data))
                      }}
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                      title="Copy message"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-zinc-300">
                  <div className="font-mono bg-zinc-800 rounded p-2 overflow-x-auto">
                    {selectedMessageIndex === index ? (
                      <pre className="whitespace-pre-wrap wrap-break-word">
                        {formatMessageData(message.data)}
                      </pre>
                    ) : (
                      <div className="truncate">
                        {typeof message.data === 'string'
                          ? message.data
                          : JSON.stringify(message.data)
                        }
                      </div>
                    )}
                  </div>
                </div>

                {selectedMessageIndex === index && message.raw && message.raw !== formatMessageData(message.data) && (
                  <div className="mt-2 text-xs text-zinc-400">
                    <div className="text-zinc-500 mb-1">Raw:</div>
                    <div className="font-mono bg-zinc-800 rounded p-2 overflow-x-auto">
                      <pre className="whitespace-pre-wrap wrap-break-word">
                        {message.raw}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedMessageIndex === index && analysisResults[index] && (
                  <div className="mt-3 p-4 bg-pink-500/5 rounded-lg border border-pink-500/20 text-xs text-zinc-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={14} className="text-pink-400" />
                      <span className="font-semibold text-pink-400">AI Analysis</span>
                      <Badge variant="outline" className="border-pink-500/30 text-[10px] text-pink-300">
                        {analysisResults[index].format}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="text-zinc-500 mb-1 font-medium">Purpose:</div>
                      <div>{analysisResults[index].purpose}</div>
                    </div>

                    {analysisResults[index].securityRisks.length > 0 && (
                      <div className="mb-3">
                        <div className="text-red-400/80 mb-1 font-medium">Security Risks:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {analysisResults[index].securityRisks.map((risk: string, i: number) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="text-blue-400/80 mb-1 font-medium">Insights & Optimization:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {analysisResults[index].insights.map((insight: string, i: number) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-pink-500/10 italic text-zinc-400">
                      {analysisResults[index].summary}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with selection info */}
      {selectedMessageIndex >= 0 && (
        <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-500">
          Message {selectedMessageIndex + 1} of {messages.length} selected
          {selectedMessageIndex < messages.length - 1 && (
            <span> • Press ↓ for next</span>
          )}
          {selectedMessageIndex > 0 && (
            <span> • Press ↑ for previous</span>
          )}
        </div>
      )}
    </div>
  )
}

export default RealtimeClientServerLogsTable