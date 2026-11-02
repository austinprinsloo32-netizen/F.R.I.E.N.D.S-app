import { useState } from 'react'
import { hashHue } from '../lib/utils'

type Props = {
  id: string
  name: string
  initials: string
  src?: string
  size?: number
  rounded?: 'full' | 'soft'
  className?: string
}

export default function Avatar({
  id,
  name,
  initials,
  src,
  size = 44,
  rounded = 'full',
  className = '',
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const hue = hashHue(id)
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <span
      className={`avatar avatar-${rounded} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.36),
        background: `linear-gradient(145deg, hsl(${hue} 48% 78%), hsl(${(hue + 40) % 360} 42% 66%))`,
      }}
    >
      {showImage ? (
        <img src={src} alt={`${name}'s photo`} onError={() => setFailedSrc(src ?? null)} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  )
}
