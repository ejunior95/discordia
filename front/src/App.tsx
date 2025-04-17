import { ThemeProvider } from './components/theme-provider'
import { ChatBody } from './custom-components/ChatBody'
import { Navbar } from './custom-components/Navbar'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="discordia-theme-select">
      <Navbar />
      <section className='w-full h-dvh flex-col place-content-center justify-items-center absolute top-18 left-0'>
        <ChatBody />
      </section>
    </ThemeProvider>
  )
}

export default App
