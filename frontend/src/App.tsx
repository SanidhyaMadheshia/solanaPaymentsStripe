import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Route, Routes } from 'react-router'
import { ClerkProvider } from '@clerk/clerk-react'
import SignupPage from './components/pages/signup/Signup'

import DeveloperDashboard from './components/pages/dashboard/Page'
import Checkout from './components/pages/checkout/Page'
import Landing from './components/pages/landingpage/Page'
import { DashboardProvider } from './context/dashboardContext'
import {SolanaProvider} from './providers/SolanaProvider'
// import Dashboard from './components/pages/dashboard/Page'
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Routes>
        <Route path='/' element={<Landing/>}/>
        <Route path='/checkout/:invoiceId' element={
          <SolanaProvider>

            <Checkout/>
          </SolanaProvider>
          
          }/>
        <Route
          path='/*'
          element={
            <ClerkProvider publishableKey={PUBLISHABLE_KEY}>

            <Routes>

              <Route path='/signup' element={<SignupPage />} />
              <Route path='/user/dashboard' element={
                <DashboardProvider>

                  <DeveloperDashboard/>
                </DashboardProvider>
                }/>
            </Routes>  
            </ClerkProvider>
          }
        />
      </Routes>
    </>
  )
}

export default App
