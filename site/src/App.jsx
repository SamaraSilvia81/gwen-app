import { useTheme, useVersion } from './hooks'
import Nav from './components/Nav'
import Hero from './components/Hero'
import WhatIs from './components/WhatIs'
import Screens from './components/Screens'
import { Story, Testimonials, Roadmap, Pricing, FAQ, Access, Download, Footer } from './components/Sections'

export default function App() {
  const { mode, toggle } = useTheme()
  const version = useVersion()

  return (
    <>
      <Nav mode={mode} onToggle={toggle} />
      <Hero version={version} />
      <WhatIs />
      <Screens />
      <Story />
      <Testimonials />
      <Roadmap />
      <Pricing />
      <FAQ />
      <Access />
      <Download version={version} />
      <Footer />
    </>
  )
}
