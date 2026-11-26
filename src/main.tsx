import React from "react";
import { createRoot } from "react-dom/client";
import "@oreui-web/react/styles.css";
import { Scrollbar } from "@oreui-web/react/scrollbar";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Scrollbar className="page-scrollbar" aria-label="Page content">
      <App />
    </Scrollbar>
  </React.StrictMode>,
);
