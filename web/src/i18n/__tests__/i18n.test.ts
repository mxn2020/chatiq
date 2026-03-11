import { describe, it, expect } from 'vitest'
import en from '../locales/en.json'
import de from '../locales/de.json'

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return getKeys(value as Record<string, unknown>, fullKey)
        }
        return [fullKey]
    })
}

describe('i18n Locales', () => {
    const enKeys = getKeys(en)
    const deKeys = getKeys(de)

    it('en locale has keys', () => {
        expect(enKeys.length).toBeGreaterThan(0)
    })

    it('de locale has keys', () => {
        expect(deKeys.length).toBeGreaterThan(0)
    })

    it('de has all keys from en', () => {
        const missing = enKeys.filter(k => !deKeys.includes(k))
        expect(missing, `Missing in de: ${missing.join(', ')}`).toEqual([])
    })

    it('en has all keys from de', () => {
        const extra = deKeys.filter(k => !enKeys.includes(k))
        expect(extra, `Extra in de: ${extra.join(', ')}`).toEqual([])
    })

    it('no empty string values in en', () => {
        const emptyKeys = enKeys.filter(key => {
            const value = key.split('.').reduce((o: any, k) => o?.[k], en)
            return typeof value === 'string' && value.trim() === ''
        })
        expect(emptyKeys, `Empty values: ${emptyKeys.join(', ')}`).toEqual([])
    })

    it('no empty string values in de', () => {
        const emptyKeys = deKeys.filter(key => {
            const value = key.split('.').reduce((o: any, k) => o?.[k], de)
            return typeof value === 'string' && value.trim() === ''
        })
        expect(emptyKeys, `Empty values: ${emptyKeys.join(', ')}`).toEqual([])
    })

    it('en and de have the same number of keys', () => {
        expect(enKeys.length).toBe(deKeys.length)
    })
})
