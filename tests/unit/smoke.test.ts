import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('vitest is wired', () => {
    expect(1 + 1).toBe(2)
  })

  it('jsdom document is available', () => {
    const el = document.createElement('div')
    el.textContent = 'Barterkin'
    expect(el.textContent).toBe('Barterkin')
  })
})
