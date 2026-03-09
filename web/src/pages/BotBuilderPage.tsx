import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Bot, FileText, Sparkles, Layers, ArrowRight, Save,
    Plus, Trash2, Eye, EyeOff, Zap
} from 'lucide-react'
import { MODEL_REGISTRY, type ModelInfo } from '../../convex/providers'

type Id<T extends string> = string & { __tableName: T }

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', color: '#10a37f' },
    { id: 'anthropic', name: 'Anthropic', color: '#d97706' },
    { id: 'google', name: 'Google', color: '#4285f4' },
    { id: 'nvidia', name: 'NVIDIA', color: '#76b900' },
]

const AVATARS = ['🤖', '🧠', '✨', '🎯', '📝', '💡', '🔥', '⚡', '🎨', '📊', '🔬', '🏆']
const PERSONALITIES = ['friendly', 'professional', 'creative', 'analytical', 'concise', 'detailed', 'humorous', 'academic']

type WorkflowStep = {
    name: string; description: string; systemPrompt: string;
    inputMapping: 'user_message' | 'previous_output' | 'combined' | 'all_context';
    provider: string; model: string; temperature: number; maxTokens: number; isVisible: boolean;
}

export default function BotBuilderPage() {
    const navigate = useNavigate()
    const createBot = useMutation(api.bots.create)
    const saveConfig = useMutation(api.bots.saveConfig)
    const saveSteps = useMutation(api.bots.saveWorkflowSteps)

    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Step 1: Identity
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [avatar, setAvatar] = useState('🤖')
    const [type, setType] = useState<'simple' | 'advanced' | 'workflow'>('simple')
    const [provider, setProvider] = useState('openai')
    const [model, setModel] = useState('gpt-4o-mini')

    // Step 2: Config
    const [systemPrompt, setSystemPrompt] = useState('')
    const [personality, setPersonality] = useState('')
    const [temperature, setTemperature] = useState(0.7)
    const [maxTokens, setMaxTokens] = useState(1024)
    const [contextWindow, setContextWindow] = useState(10)
    const [outputFormat, setOutputFormat] = useState<'text' | 'json' | 'markdown' | 'yaml' | 'code' | 'structured'>('text')
    const [outputInstructions, setOutputInstructions] = useState('')
    const [responseFormat, setResponseFormat] = useState<'text' | 'json_object' | 'json_schema'>('text')
    const [jsonSchema, setJsonSchema] = useState('')
    const [examples, setExamples] = useState<Array<{ userMessage: string; assistantResponse: string }>>([])

    // Workflow steps
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
        { name: 'Step 1', description: '', systemPrompt: '', inputMapping: 'user_message', provider: '', model: '', temperature: 0.7, maxTokens: 1024, isVisible: true },
    ])

    const filteredModels = MODEL_REGISTRY.filter(m => m.provider === provider && m.capabilities.includes('text'))

    const handleProviderChange = (p: string) => {
        setProvider(p)
        const firstModel = MODEL_REGISTRY.find(m => m.provider === p && m.capabilities.includes('text'))
        if (firstModel) setModel(firstModel.id)
    }

    const addExample = () => setExamples([...examples, { userMessage: '', assistantResponse: '' }])
    const removeExample = (i: number) => setExamples(examples.filter((_, idx) => idx !== i))

    const addWorkflowStep = () => setWorkflowSteps([...workflowSteps, {
        name: `Step ${workflowSteps.length + 1}`, description: '', systemPrompt: '', inputMapping: 'previous_output', provider: '', model: '', temperature: 0.7, maxTokens: 1024, isVisible: true,
    }])
    const removeWorkflowStep = (i: number) => setWorkflowSteps(workflowSteps.filter((_, idx) => idx !== i))
    const updateWorkflowStep = (i: number, field: keyof WorkflowStep, value: any) => {
        const updated = [...workflowSteps]
            ; (updated[i] as any)[field] = value
        setWorkflowSteps(updated)
    }

    const selectedModelInfo = MODEL_REGISTRY.find(m => m.id === model)

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const botId = await createBot({ name, description, avatar, type, provider, model })

            await saveConfig({
                botId: botId as Id<"bots">,
                systemPrompt,
                personality: personality || undefined,
                temperature, maxTokens, contextWindow,
                outputFormat,
                outputInstructions: outputInstructions || undefined,
                responseFormat: responseFormat !== 'text' ? responseFormat : undefined,
                jsonSchema: jsonSchema || undefined,
                examples: examples.length > 0 ? examples : undefined,
            })

            if (type === 'workflow') {
                await saveSteps({
                    botId: botId as Id<"bots">,
                    steps: workflowSteps.map(s => ({
                        ...s,
                        model: s.model || undefined,
                    })),
                })
            }

            navigate('/bots')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        }
        setSaving(false)
    }

    const inputStyle: React.CSSProperties = {
        display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8,
        border: '1px solid var(--color-border)', background: 'var(--color-surface)',
        color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box',
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                <Bot size={24} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent)' }} />
                Create New Bot
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Build a chatbot persona with custom prompts and behavior</p>

            {/* Steps indicator */}
            <div style={{ display: 'flex', gap: 4, marginBottom: '2rem' }}>
                {['Identity', 'Configure', type === 'workflow' ? 'Workflow Steps' : 'Review'].map((label, i) => (
                    <div key={i} style={{ flex: 1 }}>
                        <div style={{ height: 4, borderRadius: 2, marginBottom: 6, background: step >= i + 1 ? 'var(--color-accent)' : 'var(--color-border)', opacity: step === i + 1 ? 1 : step > i + 1 ? 0.6 : 0.3 }} />
                        <span style={{ fontSize: '0.75rem', color: step >= i + 1 ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{label}</span>
                    </div>
                ))}
            </div>

            {error && (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-danger)20', color: 'var(--color-danger)', marginBottom: 16 }}>{error}</div>
            )}

            {/* Step 1: Identity */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 8, display: 'block' }}>Avatar</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {AVATARS.map(a => (
                                <button key={a} onClick={() => setAvatar(a)} style={{
                                    width: 40, height: 40, borderRadius: 8, fontSize: '1.2rem', cursor: 'pointer',
                                    border: avatar === a ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    background: avatar === a ? 'var(--color-accent)10' : 'var(--color-surface)',
                                }}>{a}</button>
                            ))}
                        </div>
                    </div>

                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        Name
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Code Reviewer, Writing Coach" style={inputStyle} />
                    </label>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        Description
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this bot do?" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                    </label>

                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 8, display: 'block' }}>Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {([
                                { value: 'simple', label: 'Simple', icon: FileText, desc: 'Single system prompt' },
                                { value: 'advanced', label: 'Advanced', icon: Sparkles, desc: 'Prompt + examples + structured output' },
                                { value: 'workflow', label: 'Workflow', icon: Layers, desc: 'Multi-step processing chain' },
                            ] as const).map(t => (
                                <button key={t.value} onClick={() => setType(t.value)} style={{
                                    padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                                    border: type === t.value ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    background: type === t.value ? 'var(--color-accent)10' : 'var(--color-surface)',
                                }}>
                                    <t.icon size={18} style={{ color: 'var(--color-accent)', marginBottom: 4 }} />
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{t.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Provider + Model selection */}
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 8, display: 'block' }}>Provider</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {PROVIDERS.map(p => (
                                <button key={p.id} onClick={() => handleProviderChange(p.id)} style={{
                                    padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                    border: provider === p.id ? `2px solid ${p.color}` : '1px solid var(--color-border)',
                                    background: provider === p.id ? `${p.color}15` : 'var(--color-surface)',
                                    fontSize: '0.8rem', fontWeight: provider === p.id ? 600 : 400,
                                    color: provider === p.id ? p.color : 'var(--color-text)',
                                }}>{p.name}</button>
                            ))}
                        </div>
                    </div>

                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        Model
                        <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle}>
                            {filteredModels.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name} ({m.tier}) — {m.contextWindow >= 1000000 ? `${m.contextWindow / 1000000}M` : `${m.contextWindow / 1000}K`} ctx
                                </option>
                            ))}
                        </select>
                    </label>

                    {selectedModelInfo && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {selectedModelInfo.capabilities.map(cap => (
                                <span key={cap} style={{
                                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12,
                                    background: 'var(--color-accent)15', color: 'var(--color-accent)',
                                    border: '1px solid var(--color-accent)30',
                                }}>
                                    {cap}
                                </span>
                            ))}
                        </div>
                    )}

                    <button onClick={() => setStep(2)} disabled={!name} style={{
                        padding: '12px 24px', borderRadius: 10, background: 'var(--color-accent)', color: 'white',
                        border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    }}>Next <ArrowRight size={16} /></button>
                </div>
            )}

            {/* Step 2: Configure */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        System Prompt
                        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                            placeholder="You are a helpful assistant that..." rows={5}
                            style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />
                    </label>

                    {type !== 'simple' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    Personality
                                    <select value={personality} onChange={e => setPersonality(e.target.value)} style={inputStyle}>
                                        <option value="">None</option>
                                        {PERSONALITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </label>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    Output Format
                                    <select value={outputFormat} onChange={e => setOutputFormat(e.target.value as any)} style={inputStyle}>
                                        {['text', 'json', 'markdown', 'yaml', 'code', 'structured'].map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </label>
                            </div>

                            {/* Structured Output */}
                            <div style={{ background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)', padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Zap size={16} style={{ color: 'var(--color-warning)' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Structured Output</span>
                                </div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    Response Format
                                    <select value={responseFormat} onChange={e => setResponseFormat(e.target.value as any)} style={inputStyle}>
                                        <option value="text">Free text</option>
                                        <option value="json_object">JSON Object (guaranteed valid JSON)</option>
                                        <option value="json_schema">JSON Schema (strict structure)</option>
                                    </select>
                                </label>
                                {responseFormat === 'json_schema' && (
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: 8, display: 'block' }}>
                                        JSON Schema
                                        <textarea value={jsonSchema} onChange={e => setJsonSchema(e.target.value)}
                                            placeholder='{"type":"object","properties":{"answer":{"type":"string"}}}'
                                            rows={4} style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />
                                    </label>
                                )}
                            </div>

                            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                Output Instructions <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
                                <textarea value={outputInstructions} onChange={e => setOutputInstructions(e.target.value)}
                                    placeholder="Always include bullet points..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </label>

                            {/* Few-shot examples */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Few-shot Examples</label>
                                    <button onClick={addExample} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Plus size={12} /> Add
                                    </button>
                                </div>
                                {examples.map((ex, i) => (
                                    <div key={i} style={{ background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', padding: 12, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Example {i + 1}</span>
                                            <button onClick={() => removeExample(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 0 }}><Trash2 size={12} /></button>
                                        </div>
                                        <input placeholder="User says..." value={ex.userMessage} onChange={e => { const up = [...examples]; up[i].userMessage = e.target.value; setExamples(up) }}
                                            style={{ ...inputStyle, marginBottom: 6 }} />
                                        <input placeholder="Bot responds..." value={ex.assistantResponse} onChange={e => { const up = [...examples]; up[i].assistantResponse = e.target.value; setExamples(up) }}
                                            style={inputStyle} />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            Temperature ({temperature})
                            <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(+e.target.value)} style={{ display: 'block', width: '100%', marginTop: 8 }} />
                        </label>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            Max Tokens
                            <input type="number" value={maxTokens} onChange={e => setMaxTokens(+e.target.value)} min={64} max={4096} style={inputStyle} />
                        </label>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            Context Window
                            <input type="number" value={contextWindow} onChange={e => setContextWindow(+e.target.value)} min={1} max={50} style={inputStyle} />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => setStep(1)} style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}>Back</button>
                        <button onClick={() => type === 'workflow' ? setStep(3) : handleSave()} disabled={!systemPrompt || saving}
                            style={{ flex: 1, padding: '12px 24px', borderRadius: 10, background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
                            {type === 'workflow' ? <><ArrowRight size={16} /> Next: Workflow Steps</> : <><Save size={16} /> {saving ? 'Saving...' : 'Create Bot'}</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Workflow Steps */}
            {step === 3 && type === 'workflow' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                        Each step processes the message through its own prompt. Hidden steps pass output to the next step without showing it.
                        For a visual node-based workflow builder, use the <a href="/workflow-builder" style={{ color: 'var(--color-accent)' }}>Workflow Builder</a> after creating the bot.
                    </p>

                    {workflowSteps.map((ws, i) => (
                        <div key={i} style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <input value={ws.name} onChange={e => updateWorkflowStep(i, 'name', e.target.value)}
                                    style={{ background: 'transparent', border: 'none', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', outline: 'none' }} />
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button onClick={() => updateWorkflowStep(i, 'isVisible', !ws.isVisible)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: ws.isVisible ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                                        {ws.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    {workflowSteps.length > 1 && (
                                        <button onClick={() => removeWorkflowStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
                                    )}
                                </div>
                            </div>

                            <textarea value={ws.systemPrompt} onChange={e => updateWorkflowStep(i, 'systemPrompt', e.target.value)}
                                placeholder="System prompt for this step..." rows={3}
                                style={{ width: '100%', ...inputStyle, fontFamily: 'monospace', marginBottom: 8, resize: 'vertical' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
                                <select value={ws.inputMapping} onChange={e => updateWorkflowStep(i, 'inputMapping', e.target.value)} style={inputStyle}>
                                    <option value="user_message">User Message</option>
                                    <option value="previous_output">Previous Output</option>
                                    <option value="combined">Combined</option>
                                    <option value="all_context">Full Context</option>
                                </select>
                                <select value={ws.provider} onChange={e => updateWorkflowStep(i, 'provider', e.target.value)} style={inputStyle}>
                                    <option value="">Bot Default Provider</option>
                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                <select value={ws.model} onChange={e => updateWorkflowStep(i, 'model', e.target.value)} style={inputStyle}>
                                    <option value="">Bot Default Model</option>
                                    {MODEL_REGISTRY.filter(m => m.capabilities.includes('text') && (!ws.provider || m.provider === ws.provider)).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                                    ))}
                                </select>
                                <input type="number" value={ws.maxTokens} onChange={e => updateWorkflowStep(i, 'maxTokens', +e.target.value)}
                                    placeholder="Max tokens" style={inputStyle} />
                            </div>
                        </div>
                    ))}

                    <button onClick={addWorkflowStep} style={{
                        padding: '10px', borderRadius: 8, border: '1px dashed var(--color-border)',
                        background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem',
                    }}>
                        <Plus size={16} /> Add Step
                    </button>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => setStep(2)} style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}>Back</button>
                        <button onClick={handleSave} disabled={saving || workflowSteps.some(s => !s.systemPrompt)}
                            style={{ flex: 1, padding: '12px 24px', borderRadius: 10, background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <Save size={16} /> {saving ? 'Saving...' : 'Create Bot'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
