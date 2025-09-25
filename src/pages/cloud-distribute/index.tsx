import { createRoot } from 'react-dom/client'
import { StrictMode, useState } from 'react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'

const App = () => {
  const [text, setText] = useState('')
  fetch('/api/helloworld')
    .then((res) => res.text())
    .then((text) => setText(text))
  return <div>{text}</div>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  </StrictMode>
)
