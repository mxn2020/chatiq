import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useNavigate } from 'react-router-dom'
import {
    Bot, Plus, Star, Trash2, MessageSquare, FileText,
    Sparkles, Layers, Heart, Settings, Zap
} from 'lucide-react'

type Id<T extends string> = string & { __tableName: T }

const TYPE_INFO: Record<string, { label: string; icon: typeof FileText; color: string }> = {
    simple: { label: 'Simple', icon: FileText, color: 'var(--color-success)' },
    advanced: { label: 'Advanced', icon: Sparkles, color: 'var(--color-info)' },
    workflow: { label: 'Workflow', icon: Layers, color: 'var(--color-warning)' },
}

export default function BotListPage() {
    const bots = useQuery(api.bots.getAll)
    const navigate = useNavigate()
    const deleteBot = useMutation(api.bots.remove)
    const toggleFav = useMutation(api.bots.toggleFavorite)
    const setDefault = useMutation(api.bots.setDefault)

    const favorites = bots?.filter(b => b.isFavorite) ?? []
    const others = bots?.filter(b => !b.isFavorite) ?? []

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        <Bot size={24} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent)' }} />
                        My Bots
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                        {bots?.length ?? 0} bot{(bots?.length ?? 0) !== 1 ? 's' : ''} created
                    </p>
                </div>
                <button
                    onClick={() => navigate('/bots/new')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                        background: 'var(--color-accent)', color: 'white', borderRadius: 10,
                        border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    }}
                >
                    <Plus size={18} /> New Bot
                </button>
            </div>

            {(!bots || bots.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <Bot size={64} style={{ color: 'var(--color-accent)', opacity: 0.4, margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>No bots yet</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>Create your first AI chatbot persona</p>
                    <button onClick={() => navigate('/bots/new')} style={{
                        padding: '10px 24px', borderRadius: 8, background: 'var(--color-accent)', color: 'white',
                        border: 'none', cursor: 'pointer', fontWeight: 500,
                    }}>Create Bot</button>
                </div>
            ) : (
                <>
                    {favorites.length > 0 && (
                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>
                                <Heart size={12} style={{ display: 'inline', marginRight: 4 }} /> Favorites
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                                {favorites.map(bot => (
                                    <BotCard key={bot._id} bot={bot}
                                        onChat={() => navigate('/chat')}
                                        onDelete={() => deleteBot({ botId: bot._id as Id<"bots"> })}
                                        onFav={() => toggleFav({ botId: bot._id as Id<"bots"> })}
                                        onDefault={() => setDefault({ botId: bot._id as Id<"bots"> })} />
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>
                            All Bots
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                            {others.map(bot => (
                                <BotCard key={bot._id} bot={bot}
                                    onChat={() => navigate('/chat')}
                                    onDelete={() => deleteBot({ botId: bot._id as Id<"bots"> })}
                                    onFav={() => toggleFav({ botId: bot._id as Id<"bots"> })}
                                    onDefault={() => setDefault({ botId: bot._id as Id<"bots"> })} />
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}

function BotCard({ bot, onChat, onDelete, onFav, onDefault }: {
    bot: any; onChat: () => void; onDelete: () => void; onFav: () => void; onDefault: () => void;
}) {
    const typeInfo = TYPE_INFO[bot.type] || TYPE_INFO.simple
    const TypeIcon = typeInfo.icon

    return (
        <div style={{
            background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)',
            padding: '1.25rem', transition: 'all 0.2s',
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.75rem' }}>{bot.avatar || '🤖'}</span>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {bot.name}
                            {bot.isDefault && <Star size={12} fill="var(--color-warning)" color="var(--color-warning)" />}
                        </h3>
                        <span style={{
                            fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
                            background: typeInfo.color + '20', color: typeInfo.color,
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                            <TypeIcon size={10} /> {typeInfo.label}
                        </span>
                    </div>
                </div>
            </div>

            {bot.description && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                    {bot.description.substring(0, 80)}{bot.description.length > 80 ? '...' : ''}
                </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                <span><MessageSquare size={12} style={{ display: 'inline', marginRight: 3 }} /> {bot.messageCount} msgs</span>
                <span>{bot.model.split('/').pop()}</span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={onChat} style={{
                    flex: 1, padding: '7px', borderRadius: 6, background: 'var(--color-accent)', color: 'white',
                    border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                }}>Chat</button>
                <button onClick={onFav} title="Favorite" style={{
                    padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', cursor: 'pointer',
                    color: bot.isFavorite ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                }}>
                    <Heart size={13} fill={bot.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button onClick={onDefault} title="Set as default" style={{
                    padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', cursor: 'pointer',
                    color: bot.isDefault ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                }}>
                    <Star size={13} fill={bot.isDefault ? 'currentColor' : 'none'} />
                </button>
                <button onClick={onDelete} title="Delete" style={{
                    padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-danger)',
                }}>
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    )
}
