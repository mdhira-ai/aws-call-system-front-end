import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import './index.css'
import DataTransferTest from "./peer-data-transfer-test/page";
import App from "./App";

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/datatest" element={<DataTransferTest />} />
    </Routes>
  </BrowserRouter>,
);
