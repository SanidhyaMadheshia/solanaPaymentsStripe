// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Route, Routes } from 'react-router'
import { ClerkProvider } from '@clerk/clerk-react'
import SignupPage from './components/pages/signup/Signup'
// import "./index.css"
import DeveloperDashboard from './components/pages/dashboard/Page'
import Checkout from './components/pages/checkout/Page'
import Landing from './components/pages/landingpage/Page'
import { DashboardProvider } from './context/dashboardContext'
import { WalletContextProvider } from './providers/SolanaProvider'
import { ChainContextProvider } from './context/ChainContextProvider'
import { SelectedWalletAccountContextProvider } from './context/SelectedWalletAccountContextProvider'
import { RpcContextProvider } from './context/RpcContextProvider'
import Documentation from './components/pages/docs/page'
import SuccessPage from './components/pages/checkout/SuccessPage'
import Failure from './components/pages/checkout/Failure'
// import Dashboard from './components/pages/dashboard/Page'
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}
function App() {
  // const [count, setCount] = useState(0)

  return (
    <>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/docs' element={<Documentation />} />
        <Route path='/success/:invoiceId' element={
          <SuccessPage/>
        }/>
        <Route path='/failure' element={
          <Failure/>
        }/>
        <Route path='/checkout/:invoiceId' element={
          <WalletContextProvider>

            <ChainContextProvider>
              <SelectedWalletAccountContextProvider>
                <RpcContextProvider>


                  <Checkout />


                </RpcContextProvider>
              </SelectedWalletAccountContextProvider>
            </ChainContextProvider>

          </WalletContextProvider>
        } />
        <Route
          path='/*'
          element={
            <ClerkProvider publishableKey={PUBLISHABLE_KEY}>

              <Routes>

                <Route path='/signup' element={<SignupPage />} />
                <Route path='/user/dashboard' element={
                  <DashboardProvider>

                    <DeveloperDashboard />
                  </DashboardProvider>
                } />
              </Routes>
            </ClerkProvider>
          }
        />
      </Routes>
    </>
  )
}

export default App
