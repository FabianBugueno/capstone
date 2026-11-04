import { useEffect, useState } from "react";

export type Tema = "claro" | "oscuro";

// index.html aplica el tema antes del render; este hook lo lee y lo alterna
function temaActual(): Tema {
  return document.documentElement.dataset.theme === "dark" ? "oscuro" : "claro";
}

export default function useTema() {
  const [tema, setTema] = useState<Tema>(temaActual);

  useEffect(() => {
    const raiz = document.documentElement;
    const nuevo = tema === "oscuro" ? "dark" : "light";
    // Transicion de colores solo durante el cambio (no en cada render)
    if (raiz.dataset.theme && raiz.dataset.theme !== nuevo) {
      raiz.classList.add("pgp-tema-cambiando");
      window.setTimeout(() => raiz.classList.remove("pgp-tema-cambiando"), 350);
    }
    raiz.dataset.theme = nuevo;
    try {
      localStorage.setItem("tema", tema);
    } catch {
      // sin almacenamiento: el tema dura solo esta sesion
    }
  }, [tema]);

  return [tema, () => setTema((t) => (t === "claro" ? "oscuro" : "claro"))] as const;
}
