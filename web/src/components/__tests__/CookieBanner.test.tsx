import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CookieBanner from '../CookieBanner'

describe('CookieBanner', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.useFakeTimers()
    })

    it('does not show immediately', () => {
        render(<CookieBanner />)
        expect(screen.queryByText(/cookies/i)).not.toBeInTheDocument()
    })

    it('shows after 1.5s delay when no consent stored', async () => {
        render(<CookieBanner />)
        await act(async () => { vi.advanceTimersByTime(1600) })
        expect(screen.getByText(/cookies/i)).toBeInTheDocument()
    })

    it('does not show when consent was already accepted', async () => {
        localStorage.setItem('{{APP_SLUG}}-cookie-consent', 'accepted')
        render(<CookieBanner />)
        await act(async () => { vi.advanceTimersByTime(2000) })
        expect(screen.queryByText(/cookies/i)).not.toBeInTheDocument()
    })

    it('hides on accept click', async () => {
        render(<CookieBanner />)
        await act(async () => { vi.advanceTimersByTime(1600) })
        fireEvent.click(screen.getByText('Accept'))
        expect(screen.queryByText(/cookies/i)).not.toBeInTheDocument()
        expect(localStorage.getItem('{{APP_SLUG}}-cookie-consent')).toBe('accepted')
    })

    it('hides on decline click', async () => {
        render(<CookieBanner />)
        await act(async () => { vi.advanceTimersByTime(1600) })
        fireEvent.click(screen.getByText('Decline'))
        expect(screen.queryByText(/cookies/i)).not.toBeInTheDocument()
        expect(localStorage.getItem('{{APP_SLUG}}-cookie-consent')).toBe('declined')
    })

    it('contains a privacy policy link', async () => {
        render(<CookieBanner />)
        await act(async () => { vi.advanceTimersByTime(1600) })
        const link = screen.getByText('Privacy Policy')
        expect(link.getAttribute('href')).toBe('/privacy')
    })

    afterEach(() => {
        vi.useRealTimers()
    })
})
