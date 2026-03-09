import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Plus, Trash2, Save, ZoomIn, ZoomOut, Play, Eye, EyeOff,
    MessageSquare, GitBranch, Shuffle, Code, ArrowRight
} from 'lucide-react'
import { MODEL_REGISTRY } from '../../convex/providers'

type Id<T extends string> = string & { __tableName: T }

const NODE_TYPES = [
    { type: 'input', label: 'Input', icon: MessageSquare, color: '#10b981', desc: 'User message entry' },
    { type: 'llm', label: 'LLM Call', icon: MessageSquare, color: '#6366f1', desc: 'AI model call' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: '#f59e0b', desc: 'If/else branching' },
    { type: 'transform', label: 'Transform', icon: Code, color: '#8b5cf6', desc: 'Convert or extract data' },
    { type: 'merge', label: 'Merge', icon: Shuffle, color: '#06b6d4', desc: 'Combine branch outputs' },
    { type: 'output', label: 'Output', icon: ArrowRight, color: '#ef4444', desc: 'Final response' },
] as const

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'google', name: 'Google' },
    { id: 'nvidia', name: 'NVIDIA' },
]

type WFNode = {
    nodeId: string
    nodeType: typeof NODE_TYPES[number]['type']
    name: string
    description: string
    positionX: number
    positionY: number
    systemPrompt: string
    provider: string
    model: string
    temperature: number
    maxTokens: number
    conditionField: string
    conditionValue: string
    transformType: string
    transformConfig: string
    outputFormat: string
    isVisible: boolean
}

type WFConnection = { sourceNodeId: string; targetNodeId: string; sourcePort: string; targetPort: string }

let nodeCounter = 0

export default function WorkflowBuilderPage() {
    const { botId } = useParams<{ botId: string }>()
    const navigate = useNavigate()
    const bot = useQuery(api.bots.getById, botId ? { botId: botId as Id<"bots"> } : 'skip')
    const existingWorkflow = useQuery(api.bots.getWorkflowNodes, botId ? { botId: botId as Id<"bots"> } : 'skip')
    const saveWorkflow = useMutation(api.bots.saveWorkflowNodes)

    const canvasRef = useRef<HTMLDivElement>(null)
    const [nodes, setNodes] = useState<WFNode[]>([])
    const [connections, setConnections] = useState<WFConnection[]>([])
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
    const [connecting, setConnecting] = useState<{ nodeId: string; port: string } | null>(null)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [saving, setSaving] = useState(false)
    const [testInput, setTestInput] = useState('')
    const [showTest, setShowTest] = useState(false)

    // Init from existing workflow
    useEffect(() => {
        if (existingWorkflow && existingWorkflow.nodes.length > 0 && nodes.length === 0) {
            setNodes(existingWorkflow.nodes.map(n => ({
                nodeId: n.nodeId, nodeType: n.nodeType as any, name: n.name,
                description: n.description || '', positionX: n.positionX, positionY: n.positionY,
                systemPrompt: n.systemPrompt || '', provider: n.provider || '', model: n.model || '',
                temperature: n.temperature ?? 0.7, maxTokens: n.maxTokens ?? 1024,
                conditionField: n.conditionField || '', conditionValue: n.conditionValue || '',
                transformType: n.transformType || '', transformConfig: n.transformConfig || '',
                outputFormat: n.outputFormat || '', isVisible: n.isVisible,
            })))
            setConnections(existingWorkflow.connections.map(c => ({
                sourceNodeId: c.sourceNodeId, targetNodeId: c.targetNodeId,
                sourcePort: c.sourcePort, targetPort: c.targetPort,
            })))
        }
    }, [existingWorkflow])

    const addNode = (type: typeof NODE_TYPES[number]['type']) => {
        const id = `${type}-${Date.now()}-${nodeCounter++}`
        setNodes(prev => [...prev, {
            nodeId: id, nodeType: type, name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${prev.filter(n => n.nodeType === type).length + 1}`,
            description: '', positionX: 200 + Math.random() * 300, positionY: 150 + Math.random() * 200,
            systemPrompt: '', provider: '', model: '', temperature: 0.7, maxTokens: 1024,
            conditionField: '', conditionValue: '', transformType: '', transformConfig: '',
            outputFormat: '', isVisible: true,
        }])
    }

    const deleteNode = (nodeId: string) => {
        setNodes(prev => prev.filter(n => n.nodeId !== nodeId))
        setConnections(prev => prev.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId))
        if (selectedNodeId === nodeId) setSelectedNodeId(null)
    }

    const updateNode = (nodeId: string, field: keyof WFNode, value: any) => {
        setNodes(prev => prev.map(n => n.nodeId === nodeId ? { ...n, [field]: value } : n))
    }

    const startConnect = (nodeId: string, port: string) => {
        if (connecting) {
            if (connecting.nodeId !== nodeId) {
                setConnections(prev => [...prev, {
                    sourceNodeId: connecting.nodeId, targetNodeId: nodeId,
                    sourcePort: connecting.port, targetPort: port,
                }])
            }
            setConnecting(null)
        } else {
            setConnecting({ nodeId, port })
        }
    }

    const onMouseDown = (e: React.MouseEvent, nodeId: string) => {
        const rect = (e.target as HTMLElement).closest('[data-node]')?.getBoundingClientRect()
        if (!rect) return
        setDragging({ nodeId, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top })
        setSelectedNodeId(nodeId)
    }

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging || !canvasRef.current) return
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const x = (e.clientX - canvasRect.left - pan.x) / zoom - dragging.offsetX + 60
        const y = (e.clientY - canvasRect.top - pan.y) / zoom - dragging.offsetY + 20
        updateNode(dragging.nodeId, 'positionX', Math.max(0, x))
        updateNode(dragging.nodeId, 'positionY', Math.max(0, y))
    }, [dragging, zoom, pan])

    const onMouseUp = useCallback(() => setDragging(null), [])

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
    }, [onMouseMove, onMouseUp])

    const handleSave = async () => {
        if (!botId) return
        setSaving(true)
        try {
            await saveWorkflow({
                botId: botId as Id<"bots">,
                nodes: nodes.map(n => ({
                    nodeId: n.nodeId, nodeType: n.nodeType as any, name: n.name,
                    description: n.description || undefined, positionX: n.positionX, positionY: n.positionY,
                    systemPrompt: n.systemPrompt || undefined, provider: n.provider || undefined,
                    model: n.model || undefined, temperature: n.temperature, maxTokens: n.maxTokens,
                    conditionField: n.conditionField || undefined, conditionValue: n.conditionValue || undefined,
                    transformType: n.transformType ? n.transformType as any : undefined,
                    transformConfig: n.transformConfig || undefined,
                    outputFormat: n.outputFormat ? n.outputFormat as any : undefined, isVisible: n.isVisible,
                })),
                connections,
            })
        } catch (err) { console.error(err) }
        setSaving(false)
    }

    const selectedNode = nodes.find(n => n.nodeId === selectedNodeId)
    const nodeTypeInfo = (type: string) => NODE_TYPES.find(t => t.type === type)

    const inputStyle: React.CSSProperties = {
        display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6,
        border: '1px solid var(--color-border)', background: 'var(--color-bg)',
        color: 'var(--color-text)', fontSize: '0.8rem', boxSizing: 'border-box',
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {bot?.avatar || '🤖'} {bot?.name || 'Workflow Builder'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 4 }}>
                        {nodes.length} nodes · {connections.length} connections
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', color: 'var(--color-text)' }}><ZoomOut size={14} /></button>
                    <span style={{ fontSize: '0.75rem', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', color: 'var(--color-text)' }}><ZoomIn size={14} /></button>
                    <button onClick={() => setShowTest(!showTest)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: showTest ? 'var(--color-accent)15' : 'var(--color-bg)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Play size={12} /> Test
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left: Node Palette */}
                <div style={{ width: 180, borderRight: '1px solid var(--color-border)', padding: 12, overflowY: 'auto', background: 'var(--color-surface)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Nodes</div>
                    {NODE_TYPES.map(nt => (
                        <button key={nt.type} onClick={() => addNode(nt.type)} style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
                            borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                            cursor: 'pointer', marginBottom: 6, textAlign: 'left',
                        }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: `${nt.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <nt.icon size={12} style={{ color: nt.color }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text)' }}>{nt.label}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>{nt.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Center: Canvas */}
                <div ref={canvasRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--color-bg)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setSelectedNodeId(null); setConnecting(null) } }}>
                    {/* Grid pattern */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <defs><pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
                            <circle cx={1} cy={1} r={0.5} fill="var(--color-border)" opacity={0.5} />
                        </pattern></defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', inset: 0 }}>
                        {/* Connection Lines */}
                        <svg style={{ position: 'absolute', inset: 0, width: 3000, height: 2000, pointerEvents: 'none' }}>
                            {connections.map((conn, i) => {
                                const src = nodes.find(n => n.nodeId === conn.sourceNodeId)
                                const tgt = nodes.find(n => n.nodeId === conn.targetNodeId)
                                if (!src || !tgt) return null
                                const x1 = src.positionX + 120; const y1 = src.positionY + 30
                                const x2 = tgt.positionX; const y2 = tgt.positionY + 30
                                const midX = (x1 + x2) / 2
                                return (
                                    <g key={i}>
                                        <path d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                                            stroke={conn.sourcePort === 'true' ? '#10b981' : conn.sourcePort === 'false' ? '#ef4444' : 'var(--color-accent)'}
                                            strokeWidth={2} fill="none" opacity={0.7} />
                                        <circle cx={x2} cy={y2} r={4} fill={conn.sourcePort === 'true' ? '#10b981' : conn.sourcePort === 'false' ? '#ef4444' : 'var(--color-accent)'} />
                                    </g>
                                )
                            })}
                        </svg>

                        {/* Nodes */}
                        {nodes.map(node => {
                            const info = nodeTypeInfo(node.nodeType)
                            const isSelected = selectedNodeId === node.nodeId
                            return (
                                <div key={node.nodeId} data-node
                                    onMouseDown={e => onMouseDown(e, node.nodeId)}
                                    style={{
                                        position: 'absolute', left: node.positionX, top: node.positionY,
                                        width: 220, borderRadius: 10, cursor: dragging?.nodeId === node.nodeId ? 'grabbing' : 'grab',
                                        border: isSelected ? `2px solid ${info?.color}` : '1px solid var(--color-border)',
                                        background: 'var(--color-card)', boxShadow: isSelected ? `0 0 12px ${info?.color}30` : '0 2px 8px rgba(0,0,0,0.1)',
                                        transition: dragging?.nodeId === node.nodeId ? 'none' : 'box-shadow 0.2s',
                                    }}>
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 20, height: 20, borderRadius: 4, background: `${info?.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {info?.icon && <info.icon size={10} style={{ color: info.color }} />}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
                                        <div style={{ display: 'flex', gap: 2 }}>
                                            {node.isVisible ? <Eye size={10} style={{ color: 'var(--color-success)' }} /> : <EyeOff size={10} style={{ color: 'var(--color-text-secondary)' }} />}
                                        </div>
                                    </div>
                                    <div style={{ padding: '6px 12px 8px', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                        {node.nodeType === 'llm' && (node.model || node.provider || 'Default model')}
                                        {node.nodeType === 'condition' && `${node.conditionField || 'if'} ${node.conditionValue || '...'}`}
                                        {node.nodeType === 'transform' && (node.transformType || 'transform')}
                                        {node.nodeType === 'input' && 'User message'}
                                        {node.nodeType === 'output' && (node.outputFormat || 'text')}
                                        {node.nodeType === 'merge' && 'Combine outputs'}
                                    </div>
                                    {/* Ports */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px 6px' }}>
                                        <button onClick={e => { e.stopPropagation(); startConnect(node.nodeId, 'input') }}
                                            style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${connecting?.nodeId === node.nodeId ? 'var(--color-accent)' : 'var(--color-border)'}`, background: 'var(--color-bg)', cursor: 'crosshair' }} />
                                        {node.nodeType === 'condition' ? (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={e => { e.stopPropagation(); startConnect(node.nodeId, 'true') }}
                                                    style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #10b981', background: '#10b98130', cursor: 'crosshair' }} />
                                                <button onClick={e => { e.stopPropagation(); startConnect(node.nodeId, 'false') }}
                                                    style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #ef4444', background: '#ef444430', cursor: 'crosshair' }} />
                                            </div>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); startConnect(node.nodeId, 'output') }}
                                                style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${info?.color || 'var(--color-border)'}`, background: `${info?.color}30`, cursor: 'crosshair' }} />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right: Node Config Panel */}
                {selectedNode && (
                    <div style={{ width: 300, borderLeft: '1px solid var(--color-border)', padding: 16, overflowY: 'auto', background: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Configure Node</h3>
                            <button onClick={() => deleteNode(selectedNode.nodeId)} style={{ padding: 4, borderRadius: 4, border: 'none', background: 'var(--color-danger)15', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                            Name
                            <input value={selectedNode.name} onChange={e => updateNode(selectedNode.nodeId, 'name', e.target.value)} style={inputStyle} />
                        </label>

                        <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>Visible <button onClick={() => updateNode(selectedNode.nodeId, 'isVisible', !selectedNode.isVisible)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{selectedNode.isVisible ? <Eye size={12} style={{ color: 'var(--color-success)' }} /> : <EyeOff size={12} style={{ color: 'var(--color-text-secondary)' }} />}</button></span>
                        </label>

                        {selectedNode.nodeType === 'llm' && (
                            <>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                    System Prompt
                                    <textarea value={selectedNode.systemPrompt} onChange={e => updateNode(selectedNode.nodeId, 'systemPrompt', e.target.value)}
                                        rows={4} style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />
                                </label>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                    Provider <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(override)</span>
                                    <select value={selectedNode.provider} onChange={e => updateNode(selectedNode.nodeId, 'provider', e.target.value)} style={inputStyle}>
                                        <option value="">Bot Default</option>
                                        {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </label>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                    Model <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(override)</span>
                                    <select value={selectedNode.model} onChange={e => updateNode(selectedNode.nodeId, 'model', e.target.value)} style={inputStyle}>
                                        <option value="">Bot Default</option>
                                        {MODEL_REGISTRY.filter(m => m.capabilities.includes('text') && (!selectedNode.provider || m.provider === selectedNode.provider)).map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                                        ))}
                                    </select>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                        Temp ({selectedNode.temperature})
                                        <input type="range" min="0" max="1" step="0.1" value={selectedNode.temperature}
                                            onChange={e => updateNode(selectedNode.nodeId, 'temperature', +e.target.value)} style={{ display: 'block', width: '100%' }} />
                                    </label>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                        Max Tokens
                                        <input type="number" value={selectedNode.maxTokens} onChange={e => updateNode(selectedNode.nodeId, 'maxTokens', +e.target.value)} style={inputStyle} />
                                    </label>
                                </div>
                            </>
                        )}

                        {selectedNode.nodeType === 'condition' && (
                            <>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                    Condition Type
                                    <select value={selectedNode.conditionField} onChange={e => updateNode(selectedNode.nodeId, 'conditionField', e.target.value)} style={inputStyle}>
                                        <option value="contains">Contains text</option>
                                        <option value="equals">Equals</option>
                                        <option value="length_gt">Length greater than</option>
                                        <option value="regex">Regex match</option>
                                    </select>
                                </label>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                    Value
                                    <input value={selectedNode.conditionValue} onChange={e => updateNode(selectedNode.nodeId, 'conditionValue', e.target.value)}
                                        placeholder={selectedNode.conditionField === 'length_gt' ? '100' : 'search text...'} style={inputStyle} />
                                </label>
                            </>
                        )}

                        {selectedNode.nodeType === 'transform' && (
                            <>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                    Transform Type
                                    <select value={selectedNode.transformType} onChange={e => updateNode(selectedNode.nodeId, 'transformType', e.target.value)} style={inputStyle}>
                                        <option value="json_parse">Parse JSON</option>
                                        <option value="json_stringify">Stringify JSON</option>
                                        <option value="regex_extract">Regex Extract</option>
                                        <option value="template">Template</option>
                                        <option value="uppercase">Uppercase</option>
                                        <option value="lowercase">Lowercase</option>
                                        <option value="trim">Trim</option>
                                    </select>
                                </label>
                                {(selectedNode.transformType === 'regex_extract' || selectedNode.transformType === 'template') && (
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                        {selectedNode.transformType === 'regex_extract' ? 'Regex Pattern' : 'Template'}
                                        <input value={selectedNode.transformConfig} onChange={e => updateNode(selectedNode.nodeId, 'transformConfig', e.target.value)}
                                            placeholder={selectedNode.transformType === 'regex_extract' ? '(\\d+)' : 'Result: {{input}}'} style={inputStyle} />
                                    </label>
                                )}
                            </>
                        )}

                        {selectedNode.nodeType === 'output' && (
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
                                Output Format
                                <select value={selectedNode.outputFormat} onChange={e => updateNode(selectedNode.nodeId, 'outputFormat', e.target.value)} style={inputStyle}>
                                    <option value="text">Text</option>
                                    <option value="json">JSON</option>
                                    <option value="yaml">YAML</option>
                                    <option value="markdown">Markdown</option>
                                    <option value="code">Code</option>
                                </select>
                            </label>
                        )}
                    </div>
                )}
            </div>

            {/* Test Panel */}
            {showTest && (
                <div style={{ height: 160, borderTop: '1px solid var(--color-border)', padding: 12, background: 'var(--color-surface)', display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Test Input</div>
                        <textarea value={testInput} onChange={e => setTestInput(e.target.value)} placeholder="Enter a test message..."
                            rows={4} style={{ width: '100%', ...inputStyle, resize: 'none', height: '100%' }} />
                    </div>
                    <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>Save workflow and test via the chat interface.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
