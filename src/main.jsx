import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./tablet.css";
import { installClickFx } from "./ui/clickfx.js";
import { Icon } from "./ui/Icon.jsx";
import { sfx } from "./lib/sfx.js";
import { DESKTOP, desktopHint } from "./lib/device.js";

installClickFx();
if (DESKTOP) document.documentElement.classList.add("desktop"); // appli PC : voir lib/device.js
// le son d'interface se débloque au premier geste (exigence des navigateurs)
if (typeof window !== "undefined") window.addEventListener("pointerdown", () => sfx.unlock(), { once: true, capture: true });

/** Coque de tablette (visible seulement sur grand écran, dans un navigateur ; sur téléphone ces boîtes n'existent pas pour la mise en page). */
function Shell({ children }) {
  const [now, setNow] = useState(() => new Date());
  const [red, setRed] = useState(() => { try { return localStorage.getItem("ph-shell") === "red"; } catch { return false; } });
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);
  useEffect(() => { const f = () => { try { setRed(localStorage.getItem("ph-shell") === "red"); } catch { /* rien */ } }; window.addEventListener("ph-shell", f); return () => window.removeEventListener("ph-shell", f); }, []);
  const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className={"shell" + (red ? " red" : "")}>
      <div className="shell-screen">
        <div className="shell-status" aria-hidden="true"><span>{hh}:{mm}</span><span className="icons"><Icon name="wifi" size={15} /><span className="batt"><i /></span></span></div>
        {children}
      </div>
    </div>
  );
}

// Sur l'appli PC, l'écran de l'ordinateur est déjà l'écran du jeu : pas de fausse tablette, l'appli occupe toute la fenêtre.
createRoot(document.getElementById("root")).render(DESKTOP ? <App /> : <Shell><App /></Shell>);
desktopHint();
