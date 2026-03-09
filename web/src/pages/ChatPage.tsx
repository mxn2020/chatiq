import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Send, Bot, Plus, ChevronDown, Clock, Layers,
    MessageSquare, Pin, Archive, Trash2, Edit2, Check, X,
    Sparkles, Cpu, Menu, Settings, Copy, RotateCcw, ThumbsUp, ThumbsDown
} from 'lucide-react'

type Id<T extends string> = string & { __tableName: T }

export default function ChatPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const bots = useQuery(api.bots.getAll)
    const conversations = useQuery(api.conversations.getAll, {})
    const currentConv = useQuery(
        api.conversations.getWithMessages,
        id ? { conversationId: id as Id<"conversations"> } : 'skip'
    )

    const createConv = useMutation(api.conversations.create)
    const renameConv = useMutation(api.conversations.rename)
    const deleteConv = useMutation(api.conversations.remove)
    const togglePinConv = useMutation(api.conversations.togglePin)
    const archiveConv = useMutation(api.conversations.archive)
    const switchBotMut = useMutation(api.conversations.switchBot)
    const sendMessage = useAction(api.chat.send)
    const retryMessage = useAction(api.chat.retry)
    const rateMessage = useAction(api.chat.rateMessage)

    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [showBotPicker, setShowBotPicker] = useState(false)
    const [showSidebar, setShowSidebar] = useState(true)
    const [editTitle, setEditTitle] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const activeBot = bots?.find(b =>
        currentConv?.conversation?.activeBotId === b._id
    )

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [currentConv?.messages])

    const handleSend = async () => {
        if (!input.trim() || sending || !id || !activeBot) return
        const msg = input.trim()
        setInput('')
        setSending(true)
        try {
            await sendMessage({
                conversationId: id as Id<"conversations">,
                botId: activeBot._id as Id<"bots">,
                content: msg,
            })
        } catch (err) {
            console.error(err)
        }
        setSending(false)
        inputRef.current?.focus()
    }

    const handleNew = async () => {
        const defaultBot = bots?.find(b => b.isDefault) ?? bots?.[0]
        const convId = await createConv({
            title: 'New Chat',
            botId: defaultBot?._id as Id<"bots"> | undefined,
        })
        navigate(`/chat/${convId}`)
    }

    const handleSwitchBot = async (botId: string) => {
        if (!id) return
        await switchBotMut({
            conversationId: id as Id<"conversations">,
            botId: botId as Id<"bots">,
        })
        setShowBotPicker(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const pinnedConvs = conversations?.filter(c => c.isPinned) ?? []
    const recentConvs = conversations?.filter(c => !c.isPinned) ?? []

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{
                width: showSidebar ? 280 : 0, overflow: 'hidden', transition: 'width 0.2s',
                background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
            }}>
                <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border)' }}>
                    <button onClick={handleNew} style={{
                        width: '100%', padding: '10px', borderRadius: 8, border: '1px dashed var(--color-border)',
                        background: 'transparent', color: 'var(--color-text)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem',
                    }}>
                        <Plus size={16} /> New Chat
                    </button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                    {pinnedConvs.length > 0 && (
                        <>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', padding: '4px 8px', textTransform: 'uppercase' }}>
                                Pinned
                            </div>
                            {pinnedConvs.map(c => (
                                <ConvItem key={c._id} conv={c} isActive={c._id === id}
                                    onClick={() => navigate(`/chat/${c._id}`)}
                                    onPin={() => togglePinConv({ conversationId: c._id as Id<"conversations"> })}
                                    onArchive={() => archiveConv({ conversationId: c._id as Id<"conversations"> })}
                                    onDelete={() => { deleteConv({ conversationId: c._id as Id<"conversations"> }); if (c._id === id) navigate('/chat') }}
                                    onRename={(t) => renameConv({ conversationId: c._id as Id<"conversations">, title: t })} />
                            ))}
                        </>
                    )}
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', padding: '4px 8px', textTransform: 'uppercase', marginTop: pinnedConvs.length > 0 ? 8 : 0 }}>
                        Recent
                    </div>
                    {recentConvs.map(c => (
                        <ConvItem key={c._id} conv={c} isActive={c._id === id}
                            onClick={() => navigate(`/chat/${c._id}`)}
                            onPin={() => togglePinConv({ conversationId: c._id as Id<"conversations"> })}
                            onArchive={() => archiveConv({ conversationId: c._id as Id<"conversations"> })}
                            onDelete={() => { deleteConv({ conversationId: c._id as Id<"conversations"> }); if (c._id === id) navigate('/chat') }}
                            onRename={(t) => renameConv({ conversationId: c._id as Id<"conversations">, title: t })} />
                    ))}
                    {(!conversations || conversations.length === 0) && (
                        <p style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                            No conversations yet
                        </p>
                    )}
                </div>

                <div style={{ padding: '8px', borderTop: '1px solid var(--color-border)' }}>
                    <button onClick={() => navigate('/bots')} style={{
                        width: '100%', padding: '8px', borderRadius: 6, border: 'none',
                        background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem',
                    }}>
                        <Settings size={14} /> Manage Bots
                    </button>
                </div>
            </div>

            {/* Main chat area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Chat header */}
                <div style={{
                    padding: '10px 16px', borderBottom: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-card)',
                }}>
                    <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
                        <Menu size={18} />
                    </button>

                    {id && currentConv?.conversation ? (
                        <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {currentConv.conversation.title}
                                </h2>
                            </div>

                            {/* Bot picker */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowBotPicker(!showBotPicker)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                                        borderRadius: 8, border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)', cursor: 'pointer',
                                        color: 'var(--color-text)', fontSize: '0.8rem',
                                    }}
                                >
                                    <Bot size={14} style={{ color: 'var(--color-accent)' }} />
                                    {activeBot?.name ?? 'Select Bot'}
                                    <ChevronDown size={12} />
                                </button>

                                {showBotPicker && bots && (
                                    <div style={{
                                        position: 'absolute', right: 0, top: '100%', marginTop: 4,
                                        background: 'var(--color-card)', border: '1px solid var(--color-border)',
                                        borderRadius: 10, padding: 4, minWidth: 220, zIndex: 100,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                    }}>
                                        <div style={{ padding: '4px 8px', fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Switch Bot
                                        </div>
                                        {bots.map(bot => (
                                            <button key={bot._id} onClick={() => handleSwitchBot(bot._id)}
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: 6,
                                                    border: 'none', background: bot._id === activeBot?._id ? 'var(--color-accent)15' : 'transparent',
                                                    color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left',
                                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.1rem' }}>{bot.avatar || '🤖'}</span>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{bot.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                                        {bot.type} · {bot.model.split('/').pop()}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0', padding: '4px 0' }}>
                                            <button onClick={() => { setShowBotPicker(false); navigate('/bots/new') }}
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: 6, border: 'none',
                                                    background: 'transparent', color: 'var(--color-accent)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem',
                                                }}>
                                                <Plus size={14} /> Create New Bot
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, flex: 1 }}>ChatIQ</h2>
                    )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                    {!id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                            <Bot size={64} style={{ color: 'var(--color-accent)', opacity: 0.5 }} />
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Welcome to ChatIQ</h2>
                            <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400, textAlign: 'center' }}>
                                Create AI chatbot personas with custom prompts, personalities, and workflows. Switch between bots mid-conversation.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleNew} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MessageSquare size={16} /> New Chat
                                </button>
                                <button onClick={() => navigate('/bots/new')} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Bot size={16} /> Create Bot
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {currentConv?.messages.map(msg => (
                                <div key={msg._id} style={{
                                    maxWidth: 720, margin: msg.role === 'system' ? '8px auto' : msg.role === 'user' ? '12px 0 12px auto' : '12px auto 12px 0',
                                    display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                    alignItems: 'flex-start',
                                }}>
                                    {msg.role !== 'system' && (
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            fontSize: msg.role === 'assistant' ? '0.9rem' : '0.8rem',
                                            color: msg.role === 'user' ? 'white' : 'var(--color-text)',
                                        }}>
                                            {msg.role === 'user' ? '👤' : (bots?.find(b => b._id === msg.botId)?.avatar || '🤖')}
                                        </div>
                                    )}
                                    <div style={{ maxWidth: '85%' }}>
                                        <div style={{
                                            padding: msg.role === 'system' ? '6px 12px' : '10px 14px',
                                            borderRadius: msg.role === 'system' ? 20 : 12,
                                            background: msg.role === 'user' ? 'var(--color-accent)' : msg.role === 'system' ? 'var(--color-surface)' : 'var(--color-card)',
                                            color: msg.role === 'user' ? 'white' : msg.role === 'system' ? 'var(--color-text-secondary)' : 'var(--color-text)',
                                            border: msg.role !== 'user' ? '1px solid var(--color-border)' : 'none',
                                            fontSize: msg.role === 'system' ? '0.75rem' : '0.9rem',
                                            lineHeight: 1.6,
                                        }}>
                                            {msg.botName && msg.role === 'assistant' && (
                                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {msg.botName}
                                                    {(msg as any).provider && (
                                                        <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                                                            · {(msg as any).provider}/{((msg as any).model || '').split('/').pop()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <MessageContent content={msg.content} contentType={(msg as any).contentType} />
                                            {msg.durationMs && (
                                                <div style={{ fontSize: '0.7rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={10} /> {msg.durationMs}ms
                                                </div>
                                            )}
                                        </div>
                                        {/* Message actions */}
                                        {msg.role === 'assistant' && (
                                            <div style={{ display: 'flex', gap: 4, marginTop: 4, paddingLeft: 4 }}>
                                                <button title="Copy" onClick={() => navigator.clipboard.writeText(msg.content)}
                                                    style={{ padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                                                    <Copy size={12} />
                                                </button>
                                                <button title="Retry" onClick={async () => {
                                                    if (!id) return; setSending(true)
                                                    try { await retryMessage({ conversationId: id as any, messageId: msg._id as any }) } catch (e) { console.error(e) }
                                                    setSending(false)
                                                }} style={{ padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                                                    <RotateCcw size={12} />
                                                </button>
                                                <button title="Good response" onClick={() => rateMessage({ messageId: msg._id as any, rating: 'up' })}
                                                    style={{ padding: 4, borderRadius: 4, border: 'none', background: (msg as any).rating === 'up' ? 'var(--color-success)15' : 'transparent', cursor: 'pointer', color: (msg as any).rating === 'up' ? 'var(--color-success)' : 'var(--color-text-secondary)', opacity: (msg as any).rating === 'up' ? 1 : 0.6 }}>
                                                    <ThumbsUp size={12} />
                                                </button>
                                                <button title="Bad response" onClick={() => rateMessage({ messageId: msg._id as any, rating: 'down' })}
                                                    style={{ padding: 4, borderRadius: 4, border: 'none', background: (msg as any).rating === 'down' ? 'var(--color-danger)15' : 'transparent', cursor: 'pointer', color: (msg as any).rating === 'down' ? 'var(--color-danger)' : 'var(--color-text-secondary)', opacity: (msg as any).rating === 'down' ? 1 : 0.6 }}>
                                                    <ThumbsDown size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sending && (
                                <div style={{ maxWidth: 720, margin: '12px auto 12px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {activeBot?.avatar || '🤖'}
                                    </div>
                                    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} style={{
                                                    width: 8, height: 8, borderRadius: '50%', background: 'var(--color-text-secondary)',
                                                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input area */}
                {id && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
                        {!activeBot && (
                            <div style={{ textAlign: 'center', padding: '8px', marginBottom: 8, color: 'var(--color-warning)', fontSize: '0.8rem' }}>
                                Select a bot to start chatting
                            </div>
                        )}
                        <div style={{
                            display: 'flex', gap: 8, alignItems: 'flex-end',
                            maxWidth: 720, margin: '0 auto',
                        }}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={activeBot ? `Message ${activeBot.name}...` : 'Select a bot first...'}
                                disabled={!activeBot || sending}
                                rows={1}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 10, resize: 'none',
                                    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                                    color: 'var(--color-text)', fontSize: '0.9rem', minHeight: 42, maxHeight: 120,
                                    outline: 'none',
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || sending || !activeBot}
                                style={{
                                    padding: '10px 14px', borderRadius: 10, border: 'none',
                                    background: input.trim() && activeBot ? 'var(--color-accent)' : 'var(--color-border)',
                                    color: 'white', cursor: input.trim() && activeBot ? 'pointer' : 'not-allowed',
                                    flexShrink: 0,
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Lightweight Markdown Renderer ────────────────────────────────

function MessageContent({ content, contentType }: { content: string; contentType?: string }) {
    // For JSON content, render as formatted JSON
    if (contentType === 'json') {
        let formatted = content
        try { formatted = JSON.stringify(JSON.parse(content), null, 2) } catch { /* keep raw */ }
        return (
            <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: 'var(--color-bg)', fontSize: '0.8rem', overflow: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                <button onClick={() => navigator.clipboard.writeText(formatted)} style={{ float: 'right', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Copy</button>
                {formatted}
            </pre>
        )
    }

    // For code content
    if (contentType === 'code') {
        return (
            <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: 'var(--color-bg)', fontSize: '0.8rem', overflow: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {content}
            </pre>
        )
    }

    // Default: render markdown-like content
    return <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
}

function renderMarkdown(text: string): string {
    let html = escapeHtml(text)

    // Code blocks: ```lang\n...\n```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre style="margin:8px 0;padding:12px;border-radius:8px;background:var(--color-bg);font-family:monospace;font-size:0.8rem;overflow:auto;white-space:pre-wrap"><code>${code.trim()}</code></pre>`)

    // Inline code: `...`
    html = html.replace(/`([^`]+)`/g, '<code style="padding:1px 5px;border-radius:4px;background:var(--color-bg);font-family:monospace;font-size:0.85em">$1</code>')

    // Headers: # ... (only at start of line)
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:1rem;display:block;margin:8px 0 4px">$1</strong>')
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:1.1rem;display:block;margin:10px 0 4px">$1</strong>')
    html = html.replace(/^# (.+)$/gm, '<strong style="font-size:1.2rem;display:block;margin:12px 0 4px">$1</strong>')

    // Bold: **...**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *...*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

    // Lists: - item or * item
    html = html.replace(/^[\-\*] (.+)$/gm, '<span style="display:block;padding-left:16px">• $1</span>')
    // Numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<span style="display:block;padding-left:16px">$1. $2</span>')

    // Blockquotes: > ...
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="margin:4px 0;padding:4px 12px;border-left:3px solid var(--color-border);color:var(--color-text-secondary)">$1</blockquote>')

    // Links: [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--color-accent)">$1</a>')

    return html
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Sidebar conversation item ────────────────────────────────────

function ConvItem({ conv, isActive, onClick, onPin, onArchive, onDelete, onRename }: {
    conv: any; isActive: boolean; onClick: () => void;
    onPin: () => void; onArchive: () => void; onDelete: () => void; onRename: (t: string) => void;
}) {
    const [editing, setEditing] = useState(false)
    const [title, setTitle] = useState(conv.title)
    const [showMenu, setShowMenu] = useState(false)

    return (
        <div
            onClick={editing ? undefined : onClick}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
            style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: isActive ? 'var(--color-accent)15' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8,
                borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
            }}
        >
            <MessageSquare size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
            {editing ? (
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
                        style={{ flex: 1, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem' }}
                        onKeyDown={e => { if (e.key === 'Enter') { onRename(title); setEditing(false) } }}
                    />
                    <button onClick={e => { e.stopPropagation(); onRename(title); setEditing(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)', padding: 0 }}><Check size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); setEditing(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 0 }}><X size={12} /></button>
                </div>
            ) : (
                <>
                    <span style={{ flex: 1, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.title}
                    </span>
                    {conv.isPinned && <Pin size={10} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />}
                    {showMenu && (
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                            <button onClick={e => { e.stopPropagation(); setEditing(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}><Edit2 size={11} /></button>
                            <button onClick={e => { e.stopPropagation(); onPin() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}><Pin size={11} /></button>
                            <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 2 }}><Trash2 size={11} /></button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
