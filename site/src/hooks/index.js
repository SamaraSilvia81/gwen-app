import { useEffect, useState, useRef } from 'react'

/* ─── TEMA ─── */
export function useTheme() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('gwen.site.mode')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro'
  })

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    localStorage.setItem('gwen.site.mode', mode)
  }, [mode])

  const toggle = () => setMode(m => m === 'escuro' ? 'claro' : 'escuro')
  return { mode, toggle }
}

/* ─── VERSÃO DO GITHUB ─── */
export function useVersion(fallback = '0.9.1') {
  const [version, setVersion] = useState(fallback)
  useEffect(() => {
    fetch('https://api.github.com/repos/SamaraSilvia81/gwen-app/releases/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tag_name) setVersion(d.tag_name.replace(/^v/, '')) })
      .catch(() => {})
  }, [])
  return version
}

/* ─── REVEAL ON SCROLL ─── */
export function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('is-visible'); obs.disconnect() } },
      { threshold: .12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}
