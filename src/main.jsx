import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./theme.css";
import { installClickFx } from "./ui/clickfx.js";

installClickFx();

createRoot(document.getElementById("root")).render(<App />);
