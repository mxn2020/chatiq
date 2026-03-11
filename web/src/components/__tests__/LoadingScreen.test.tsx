import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingScreen from '../LoadingScreen'

describe('LoadingScreen', () => {
    it('renders the loading screen', () => {
        const { container } = render(<LoadingScreen />)
        expect(container.querySelector('.loading-screen')).toBeInTheDocument()
    })

    it('shows loading text', () => {
        render(<LoadingScreen />)
        expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('contains a spinner', () => {
        const { container } = render(<LoadingScreen />)
        expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
    })
})
