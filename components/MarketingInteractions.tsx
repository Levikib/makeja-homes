'use client'

import { useEffect } from 'react'

export default function MarketingInteractions() {
  useEffect(() => {
    // ── CURSOR
    const dot = document.getElementById('cur-dot')
    const ring = document.getElementById('cur-ring')
    let mx = 0, my = 0, rx = 0, ry = 0
    let curAnimId: number

    const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    document.addEventListener('mousemove', onMouseMove)

    const animCursor = () => {
      rx += (mx - rx) * 0.14
      ry += (my - ry) * 0.14
      if (dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px' }
      if (ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px' }
      curAnimId = requestAnimationFrame(animCursor)
    }
    animCursor()

    // Cursor hover effect
    const interactiveEls = document.querySelectorAll('a, button')
    interactiveEls.forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (dot) { dot.style.width = '14px'; dot.style.height = '14px' }
        if (ring) { ring.style.width = '52px'; ring.style.height = '52px'; ring.style.borderColor = 'rgba(226,125,96,0.8)' }
      })
      el.addEventListener('mouseleave', () => {
        if (dot) { dot.style.width = '8px'; dot.style.height = '8px' }
        if (ring) { ring.style.width = '38px'; ring.style.height = '52px'; ring.style.borderColor = 'rgba(226,125,96,0.45)' }
      })
    })

    // ── SCROLL PROGRESS + NAV
    const progressBar = document.getElementById('progress')
    const nav = document.getElementById('nav')

    const onScroll = () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100
      if (progressBar) progressBar.style.width = pct + '%'
      if (nav) nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.7)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── GRAIN
    const grain = document.getElementById('grain') as HTMLCanvasElement
    if (grain) {
      const ctx = grain.getContext('2d')!
      const resize = () => { grain.width = window.innerWidth; grain.height = window.innerHeight }
      resize()
      window.addEventListener('resize', resize)
      let grainTimer: ReturnType<typeof setTimeout>
      const drawGrain = () => {
        const img = ctx.createImageData(grain.width, grain.height)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255 | 0
          d[i] = d[i+1] = d[i+2] = v; d[i+3] = 12
        }
        ctx.putImageData(img, 0, 0)
        grainTimer = setTimeout(drawGrain, 80)
      }
      drawGrain()
    }

    // ── SCROLL REVEALS
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.reveal, .reveal-l, .reveal-r').forEach(el => obs.observe(el))

    // ── 3D TILT CARDS
    document.querySelectorAll('.tilt-card').forEach(card => {
      const el = card as HTMLElement
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        el.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg) translateZ(8px)`
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)'
      })
    })

    // ── COUNTER ANIMATION
    const animCount = (el: HTMLElement, target: number, suffix: string, duration: number) => {
      const isFloat = target % 1 !== 0
      let start: number | null = null
      const step = (ts: number) => {
        if (!start) start = ts
        const p = Math.min((ts - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 4)
        el.textContent = (isFloat ? (target * ease).toFixed(1) : Math.round(target * ease)) + suffix
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    const countObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          animCount(el, parseFloat(el.dataset.target!), el.dataset.suffix || '', 2200)
          countObs.unobserve(el)
        }
      })
    }, { threshold: 0.5 })
    document.querySelectorAll('.count-up').forEach(el => countObs.observe(el))

    // ── SMOOTH ANCHOR SCROLL
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = (a as HTMLAnchorElement).getAttribute('href')
        if (!href) return
        const target = document.querySelector(href)
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }) }
      })
    })

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(curAnimId)
      obs.disconnect()
      countObs.disconnect()
    }
  }, [])

  return null
}
