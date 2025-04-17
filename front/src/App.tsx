import { ThemeProvider } from './components/theme-provider'
import { ChatBody } from './custom-components/ChatBody'
import { Navbar } from './custom-components/Navbar'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="discordia-theme-select">
      <Navbar />
      <div className='h-dvh w-full flex-col'>
        <ChatBody />
      </div>
    </ThemeProvider>
  )
}

export default App
