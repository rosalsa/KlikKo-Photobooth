export type IconName =
  | 'camera' | 'sparkle' | 'arrow' | 'back' | 'refresh' | 'download' | 'upload' | 'flash'
  | 'flip' | 'timer' | 'stop' | 'auto' | 'trash' | 'rotL' | 'rotR' | 'plus' | 'minus' | 'front' | 'image' | 'check'

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'camera': return <svg {...common}><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z" /><circle cx="12" cy="13" r="3.5" /></svg>
    case 'sparkle': return <svg {...common}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></svg>
    case 'arrow': return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5" /></svg>
    case 'back': return <svg {...common}><path d="M19 12H5M10 7l-5 5 5 5" /></svg>
    case 'refresh': return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 8A7 7 0 0 1 18 6l2 2M18 16a7 7 0 0 1-11.9 2L4 16" /></svg>
    case 'download': return <svg {...common}><path d="M12 3v12m-4-4 4 4 4-4M5 21h14" /></svg>
    case 'upload': return <svg {...common}><path d="M12 16V4m-4 4 4-4 4 4M5 20h14" /></svg>
    case 'flip': return <svg {...common}><path d="M12 3v18" strokeDasharray="2 3" /><path d="M8 7 3 17h5zM16 7l5 10h-5z" /></svg>
    case 'timer': return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2h5" /></svg>
    case 'stop': return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
    case 'auto': return <svg {...common}><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" /></svg>
    case 'trash': return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
    case 'rotL': return <svg {...common}><path d="M4 4v6h6" /><path d="M4.5 10A8 8 0 1 1 6 17" /></svg>
    case 'rotR': return <svg {...common}><path d="M20 4v6h-6" /><path d="M19.5 10A8 8 0 1 0 18 17" /></svg>
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
    case 'minus': return <svg {...common}><path d="M5 12h14" /></svg>
    case 'front': return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 4H6a2 2 0 0 0-2 2v10" /></svg>
    case 'image': return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></svg>
    case 'check': return <svg {...common}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
    default: return <svg {...common}><path d="m13 2-7 12h6l-1 8 7-12h-6z" /></svg>
  }
}
