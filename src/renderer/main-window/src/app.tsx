import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'

import { APP_ROUTES } from './constants/routes'
import { ThemeProvider } from './context/theme'
// @ts-ignore
// import './assets/styles.css'
import '~/shared/assets/global.css'

const root = createRoot(document.getElementById('root') as HTMLElement)

const router = createHashRouter(APP_ROUTES)
root.render(
  <ThemeProvider>
    <RouterProvider router={router} />
  </ThemeProvider>
)
