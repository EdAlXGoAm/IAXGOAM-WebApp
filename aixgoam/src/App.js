import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "./App.css";
import Home from "./Home";

const MainScreen = () => {
    return (
        <div className="MainScreen">
            <Home />
        </div>
    )
}

function App() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<MainScreen />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;