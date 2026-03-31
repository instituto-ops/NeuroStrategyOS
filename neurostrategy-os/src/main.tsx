import React from "react";
import ReactDOM from "react-dom/client";
import App from "./shell/app"; // Importa o novo Shell da Fase 1

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
