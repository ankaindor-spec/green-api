import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, Providers } from "./app";
import "./app/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Не найдена точка монтирования.");
}

createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
