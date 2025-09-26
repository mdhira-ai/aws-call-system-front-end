import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import './index.css'
import DataTransferTest from "./peer-data-transfer-test/page";
import App from "./App";
import Calltest from "./call_test/page";

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/datatest" element={<DataTransferTest />} />
      <Route path="/calltest" element={<Calltest />} />
    </Routes>
  </BrowserRouter>,
);
