import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListingSavedEmail } from '@/emails/listing-saved'

describe('ListingSavedEmail', () => {
  it('renders with all props', () => {
    const { container } = render(
      <ListingSavedEmail
        sellerName="Alice"
        saverName="Bob"
        saverUsername="bob"
        listingTitle="Vintage Camera"
        listingUrl="https://barterkin.com/listings/123"
        siteUrl="https://barterkin.com"
      />,
    )
    expect(container.textContent).toContain('Someone is interested in your listing, Alice')
    expect(container.textContent).toContain('Bob saved your listing')
    expect(container.textContent).toContain('Vintage Camera')
    expect(container.textContent).toContain('View your listing')
  })

  it('renders with minimal props', () => {
    const { container } = render(
      <ListingSavedEmail
        listingTitle="Vintage Camera"
        listingUrl="https://barterkin.com/listings/123"
        siteUrl="https://barterkin.com"
      />,
    )
    expect(container.textContent).toContain('Someone is interested in your listing')
    expect(container.textContent).toContain('Someone saved your listing')
  })

  it('uses saver username when display name is null', () => {
    const { container } = render(
      <ListingSavedEmail
        saverUsername="bob"
        listingTitle="Vintage Camera"
        listingUrl="https://barterkin.com/listings/123"
        siteUrl="https://barterkin.com"
      />,
    )
    expect(container.textContent).toContain('bob saved your listing')
  })
})
