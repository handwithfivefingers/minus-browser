import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from '~/renderer/main-window/src/components/avatar'

describe('Avatar', () => {
  it('renders with default size', () => {
    const { container } = render(<Avatar />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.style.width).toBe('20px')
  })

  it('renders with custom size', () => {
    const { container } = render(<Avatar size={40} />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.style.width).toBe('40px')
  })

  it('renders img when src provided', () => {
    render(<Avatar src="https://example.com/icon.png" alt="icon" />)
    const img = screen.getByAltText('icon') as HTMLImageElement
    expect(img.src).toBe('https://example.com/icon.png')
  })

  it('does not render img when no src', () => {
    const { container } = render(<Avatar />)
    expect(container.querySelector('img')).toBeNull()
  })
})
