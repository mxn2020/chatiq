import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MissingConfigDialog } from '../MissingConfigDialog'

describe('MissingConfigDialog', () => {
    it('renders with default title', () => {
        render(<MissingConfigDialog message="API_KEY not configured" onClose={() => { }} />)
        expect(screen.getByText('Configuration Missing')).toBeInTheDocument()
    })

    it('renders with custom title', () => {
        render(<MissingConfigDialog title="Stripe Error" message="KEY not configured" onClose={() => { }} />)
        expect(screen.getByText('Stripe Error')).toBeInTheDocument()
    })

    it('extracts missing key from message', () => {
        render(<MissingConfigDialog message="STRIPE_SECRET_KEY not configured" onClose={() => { }} />)
        expect(screen.getByText(/STRIPE_SECRET_KEY/)).toBeInTheDocument()
    })

    it('shows fallback key when pattern does not match', () => {
        render(<MissingConfigDialog message="Something went wrong" onClose={() => { }} />)
        expect(screen.getByText(/API_KEY/)).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn()
        render(<MissingConfigDialog message="NVIDIA_API_KEY not configured" onClose={onClose} />)
        // The X button is the only button in the dialog header area
        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[0])
        expect(onClose).toHaveBeenCalledOnce()
    })

    it('displays setup instructions', () => {
        render(<MissingConfigDialog message="NVIDIA_API_KEY not configured" onClose={() => { }} />)
        expect(screen.getByText(/Setup required/)).toBeInTheDocument()
        expect(screen.getByText(/npx convex env set/)).toBeInTheDocument()
    })

    it('links to Convex dashboard', () => {
        render(<MissingConfigDialog message="KEY not configured" onClose={() => { }} />)
        const link = screen.getByText('Convex Dashboard')
        expect(link.getAttribute('href')).toBe('https://dashboard.convex.dev')
    })

    it('shows missing env var explanation', () => {
        render(<MissingConfigDialog message="KEY not configured" onClose={() => { }} />)
        expect(screen.getByText(/missing a required environment variable/)).toBeInTheDocument()
    })
})
