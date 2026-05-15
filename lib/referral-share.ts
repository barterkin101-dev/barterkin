export function buildReferralInviteMessage(referralLink: string): string {
  return `I'm on Barterkin, a local skill-trading network for neighbors. Join with my invite link: ${referralLink}`
}

export function buildReferralFollowUpMessage(referralLink: string): string {
  return `Quick follow-up: your Barterkin invite is still live if you want to join my local skill-trading circle. Here's the link again: ${referralLink}`
}

export function buildXReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    text: buildReferralInviteMessage(referralLink),
    url: referralLink,
  })

  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function buildFacebookReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    u: referralLink,
  })

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

export function buildWhatsAppReferralShareUrl(
  referralLink: string,
  message: string = buildReferralInviteMessage(referralLink),
): string {
  const params = new URLSearchParams({
    text: message,
  })

  return `https://wa.me/?${params.toString()}`
}

export function buildTelegramReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    url: referralLink,
    text: buildReferralInviteMessage(referralLink),
  })

  return `https://t.me/share/url?${params.toString()}`
}

export function buildLinkedInReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    url: referralLink,
  })

  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`
}

export function buildEmailReferralShareUrl(
  referralLink: string,
  message: string = buildReferralInviteMessage(referralLink),
): string {
  const params = new URLSearchParams({
    subject: 'Join me on Barterkin',
    body: message,
  })

  return `mailto:?${params.toString()}`
}

export function buildSmsReferralShareUrl(
  referralLink: string,
  message: string = buildReferralInviteMessage(referralLink),
): string {
  const params = new URLSearchParams({
    body: message,
  })

  return `sms:?${params.toString()}`
}
