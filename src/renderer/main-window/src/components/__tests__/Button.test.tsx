import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Button } from '~/renderer/main-window/src/components/button'

describe('Button', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDefined()
  })

  it('applies className', () => {
    render(<Button className="custom-class">Test</Button>)
    const btn = screen.getByText('Test')
    expect(btn.className).toContain('custom-class')
  })

  it('fires onClick handler', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to type button', () => {
    render(<Button>TypeTest</Button>)
    expect(screen.getByText('TypeTest').getAttribute('type')).toBe('button')
  })

  it('supports htmlType submit', () => {
    render(<Button htmlType="submit">Submit</Button>)
    expect(screen.getByText('Submit').getAttribute('type')).toBe('submit')
  })
})
