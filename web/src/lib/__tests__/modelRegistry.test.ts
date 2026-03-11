import { describe, it, expect } from 'vitest'
import { TEXT_MODELS, VISION_MODELS, IMAGE_MODELS, AUDIO_MODELS, VIDEO_MODELS, type ModelInfo } from '../modelRegistry'

function validateModels(models: ModelInfo[], category: string) {
    it(`${category} array is not empty`, () => {
        expect(models.length).toBeGreaterThan(0)
    })

    it(`${category} models have required fields`, () => {
        for (const model of models) {
            expect(model.id, `${model.name} missing id`).toBeTruthy()
            expect(model.name, `${model.id} missing name`).toBeTruthy()
            expect(model.provider, `${model.id} missing provider`).toBeTruthy()
            expect(model.description, `${model.id} missing description`).toBeTruthy()
            expect(typeof model.contextWindow).toBe('number')
            expect(Array.isArray(model.features)).toBe(true)
        }
    })

    it(`${category} models have unique IDs`, () => {
        const ids = models.map(m => m.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it(`${category} models have valid providers`, () => {
        const validProviders = ['nvidia', 'openai', 'anthropic', 'xai', 'google', 'meta', 'mistral', 'stability']
        for (const model of models) {
            expect(validProviders).toContain(model.provider)
        }
    })
}

describe('Model Registry', () => {
    describe('TEXT_MODELS', () => validateModels(TEXT_MODELS, 'TEXT_MODELS'))
    describe('VISION_MODELS', () => validateModels(VISION_MODELS, 'VISION_MODELS'))
    describe('IMAGE_MODELS', () => validateModels(IMAGE_MODELS, 'IMAGE_MODELS'))
    describe('AUDIO_MODELS', () => validateModels(AUDIO_MODELS, 'AUDIO_MODELS'))
    describe('VIDEO_MODELS', () => validateModels(VIDEO_MODELS, 'VIDEO_MODELS'))

    it('no duplicate IDs across all model categories', () => {
        const allIds = [
            ...TEXT_MODELS, ...VISION_MODELS, ...IMAGE_MODELS,
            ...AUDIO_MODELS, ...VIDEO_MODELS
        ].map(m => m.id)
        expect(new Set(allIds).size).toBe(allIds.length)
    })

    it('text models have reasonable context windows', () => {
        for (const model of TEXT_MODELS) {
            expect(model.contextWindow).toBeGreaterThan(0)
        }
    })

    it('vision models have vision feature', () => {
        for (const model of VISION_MODELS) {
            expect(model.features).toContain('vision')
        }
    })

    it('audio models have audio feature', () => {
        for (const model of AUDIO_MODELS) {
            expect(model.features).toContain('audio')
        }
    })

    it('video models have video feature', () => {
        for (const model of VIDEO_MODELS) {
            expect(model.features).toContain('video')
        }
    })
})
