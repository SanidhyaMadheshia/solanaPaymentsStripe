
import { Route, Routes } from 'react-router-dom'
import './App.css'
import Payment from "./components/Payment"

function App() {

  return (
   <>
      <Routes>
        <Route path="/payment" element={<Payment />} />
      </Routes>;


   </>
  )
}

export default App
