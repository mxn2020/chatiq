import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { Image, Volume2, Video, Download, Play, Loader } from 'lucide-react'

const TABS = [
    { id: 'image', label: 'Image', icon: Image, color: '#8b5cf6' },
    { id: 'audio', label: 'Audio (TTS)', icon: Volume2, color: '#f59e0b' },
    { id: 'video', label: 'Video', icon: Video, color: '#ef4444' },
] as const

const IMAGE_STYLES = ['photorealistic', 'illustration', 'anime', 'abstract', 'oil-painting', '3d-render', 'pixel-art', 'watercolor']
const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']

type GeneratedItem = {
    id: string; type: string; prompt: string; result: string;
    timestamp: number; status: 'generating' | 'completed' | 'failed'; error?: string;
}

export default function GeneratePage() {
    const generateImage = useAction(api.nvidia.generateImageAction)
    const generateAudio = useAction(api.nvidia.generateAudioAction)
    const generateVideo = useAction(api.nvidia.generateVideoAction)

    const [tab, setTab] = useState<'image' | 'audio' | 'video'>('image')
    const [prompt, setPrompt] = useState('')
    const [generating, setGenerating] = useState(false)
    const [items, setItems] = useState<GeneratedItem[]>([])

    // Image settings
    const [imageStyle, setImageStyle] = useState('photorealistic')
    const [aspectRatio, setAspectRatio] = useState('1:1')
    const [negativePrompt, setNegativePrompt] = useState('')

    // Audio settings
    const [voice, setVoice] = useState('alloy')

    const inputStyle: React.CSSProperties = {
        display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8,
        border: '1px solid var(--color-border)', background: 'var(--color-surface)',
        color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box',
    }

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        setGenerating(true)
        const id = `gen-${Date.now()}`
        const item: GeneratedItem = { id, type: tab, prompt, result: '', timestamp: Date.now(), status: 'generating' }
        setItems(prev => [item, ...prev])

        try {
            let result = ''
            if (tab === 'image') {
                const fullPrompt = imageStyle !== 'photorealistic' ? `${imageStyle} style: ${prompt}` : prompt
                result = await generateImage({ prompt: fullPrompt })
            } else if (tab === 'audio') {
                result = await generateAudio({ prompt, voiceId: voice })
            } else {
                result = await generateVideo({ prompt })
            }
            setItems(prev => prev.map(i => i.id === id ? { ...i, result, status: 'completed' } : i))
        } catch (err) {
            setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'failed', error: err instanceof Error ? err.message : 'Failed' } : i))
        }
        setGenerating(false)
    }

    const currentTab = TABS.find(t => t.id === tab)!

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-accent)' }}>✨</span> AI Generate
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                Create images, audio, and videos with AI
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                        border: tab === t.id ? `2px solid ${t.color}` : '1px solid var(--color-border)',
                        background: tab === t.id ? `${t.color}15` : 'var(--color-surface)',
                        color: tab === t.id ? t.color : 'var(--color-text)',
                        display: 'flex', alignItems: 'center', gap: 8, fontWeight: tab === t.id ? 600 : 400,
                    }}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {tab === 'audio' ? 'Text to speak' : 'Prompt'}
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                            placeholder={tab === 'image' ? 'A futuristic city skyline at sunset...' : tab === 'audio' ? 'Hello, welcome to ChatIQ...' : 'A cat playing piano...'}
                            rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                    </label>

                    {tab === 'image' && (
                        <>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                Style
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                    {IMAGE_STYLES.map(s => (
                                        <button key={s} onClick={() => setImageStyle(s)} style={{
                                            padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                                            border: imageStyle === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                            background: imageStyle === s ? 'var(--color-accent)15' : 'var(--color-surface)',
                                            color: imageStyle === s ? 'var(--color-accent)' : 'var(--color-text)',
                                        }}>{s}</button>
                                    ))}
                                </div>
                            </label>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                Aspect Ratio
                                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                    {ASPECT_RATIOS.map(r => (
                                        <button key={r} onClick={() => setAspectRatio(r)} style={{
                                            padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer',
                                            border: aspectRatio === r ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                            background: aspectRatio === r ? 'var(--color-accent)15' : 'var(--color-surface)',
                                            color: aspectRatio === r ? 'var(--color-accent)' : 'var(--color-text)',
                                        }}>{r}</button>
                                    ))}
                                </div>
                            </label>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                Negative Prompt <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
                                <input value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
                                    placeholder="blurry, low quality, distorted..." style={inputStyle} />
                            </label>
                        </>
                    )}

                    {tab === 'audio' && (
                        <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            Voice
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                {VOICES.map(v => (
                                    <button key={v} onClick={() => setVoice(v)} style={{
                                        padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize',
                                        border: voice === v ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        background: voice === v ? 'var(--color-accent)15' : 'var(--color-surface)',
                                        color: voice === v ? 'var(--color-accent)' : 'var(--color-text)',
                                    }}>{v}</button>
                                ))}
                            </div>
                        </label>
                    )}

                    <button onClick={handleGenerate} disabled={generating || !prompt.trim()} style={{
                        padding: '14px 24px', borderRadius: 12, background: currentTab.color, color: 'white',
                        border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: generating ? 0.6 : 1,
                    }}>
                        {generating ? <><Loader size={18} className="spin" /> Generating...</> : <><Play size={18} /> Generate {tab.charAt(0).toUpperCase() + tab.slice(1)}</>}
                    </button>
                </div>

                {/* Right: Results */}
                <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--color-text-secondary)' }}>
                        Results ({items.filter(i => i.type === tab).length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
                        {items.filter(i => i.type === tab).map(item => (
                            <div key={item.id} style={{
                                borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', overflow: 'hidden',
                            }}>
                                {item.status === 'generating' && (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                                        <div style={{ fontSize: '0.85rem' }}>Generating...</div>
                                    </div>
                                )}
                                {item.status === 'completed' && item.type === 'image' && (
                                    <img src={`data:image/png;base64,${item.result}`} alt={item.prompt}
                                        style={{ width: '100%', display: 'block' }} />
                                )}
                                {item.status === 'completed' && item.type === 'audio' && (
                                    <div style={{ padding: 16 }}>
                                        <audio controls src={`data:audio/wav;base64,${item.result}`} style={{ width: '100%' }} />
                                    </div>
                                )}
                                {item.status === 'completed' && item.type === 'video' && (
                                    <div style={{ padding: 16 }}>
                                        <video controls src={item.result} style={{ width: '100%', borderRadius: 8 }} />
                                    </div>
                                )}
                                {item.status === 'failed' && (
                                    <div style={{ padding: 16, color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                                        ❌ {item.error || 'Generation failed'}
                                    </div>
                                )}
                                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                        {item.prompt}
                                    </span>
                                    {item.status === 'completed' && (
                                        <button onClick={() => {/* download */ }} style={{ padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-accent)' }}>
                                            <Download size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {items.filter(i => i.type === tab).length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                                No {tab}s generated yet. Enter a prompt and click Generate.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
