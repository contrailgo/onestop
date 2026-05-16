import { useState } from 'react'
import DatePicker from './components/DatePicker'
import BuildingPicker from './components/BuildingPicker'
import RoomPicker from './components/RoomPicker'

function App() {
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedBuilding, setSelectedBuilding] = useState(null)

  return (
    <>
      {step === 1 && (
        <DatePicker onNext={(date) => { setSelectedDate(date); setStep(2); }} />
      )}
      {step === 2 && (
        <BuildingPicker
          onPrev={() => setStep(1)}
          onNext={(building) => { setSelectedBuilding(building); setStep(3); }}
        />
      )}
      {step === 3 && (
        <RoomPicker
          building={selectedBuilding}
          onPrev={() => setStep(2)}
          onNext={(result) => { console.log(result); }}
        />
      )}
    </>
  )
}

export default App