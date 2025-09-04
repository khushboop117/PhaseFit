
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";

// 👇 Call it once, outside ReactDOM.createRoot
// registerSW({
//   onNeedRefresh() {
//     console.log("New content available, refresh to update.");
//   },
//   onOfflineReady() {
//     console.log("App ready to work offline.");
//   },
// });
registerSW();
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
