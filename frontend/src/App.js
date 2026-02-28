import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import FinancialStatements from "@/pages/FinancialStatements";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FinancialStatements />} />
          <Route path="/financial-statements" element={<FinancialStatements />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
