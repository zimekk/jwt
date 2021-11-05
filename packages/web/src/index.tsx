import React, { StrictMode } from "react";
import { render } from "react-dom";
import App from "./containers/App";

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.body.appendChild(document.createElement("div"))
);
