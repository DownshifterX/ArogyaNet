import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('🎯 main.tsx is loading...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✅ Root element found, mounting App...');
  try {
    createRoot(rootElement).render(<App />);
    console.log('✅ App mounted successfully');
  } catch (error) {
    console.error('❌ Error mounting App:', error);
  }
}
