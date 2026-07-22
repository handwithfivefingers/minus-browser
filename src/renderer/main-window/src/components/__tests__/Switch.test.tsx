import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Switch } from '~/renderer/main-window/src/components/switch'

describe('Switch', () => {
  it('renders with label', () => {
    const { container } = render(<Switch label="Dark Mode" />)
    expect(container.textContent).toContain('Dark Mode')
  })

  it('renders without label', () => {
    const { container } = render(<Switch />)
    expect(container.querySelector('.relative.inline-flex')).toBeDefined()
  })

  it('applies custom className', () => {
    const { container } = render(<Switch className="my-4" />)
    expect(container.firstElementChild?.className).toContain('my-4')
  })
})
