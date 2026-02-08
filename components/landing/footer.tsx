const footerLinks = {
  Producto: ["Funcionalidades", "Precios", "Integraciones", "Changelog", "Roadmap"],
  Recursos: ["Blog", "Guías", "Webinars", "Centro de Ayuda", "API Docs"],
  Empresa: ["Sobre Nosotros", "Carreras", "Contacto", "Partners", "Prensa"],
  Legal: ["Privacidad", "Términos", "Cookies", "GDPR"],
}

export function Footer() {
  return (
    <footer className="border-t border-secondary/20 bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="text-lg font-bold text-primary-foreground">L</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                LAID<span className="text-secondary">A</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              La plataforma inteligente de gestión de leads diseñada para impulsar el crecimiento de tu PyME.
            </p>
            <div className="mt-6 flex gap-3">
              {["X", "In", "IG", "YT"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary/30 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/10 hover:text-secondary-foreground"
                  aria-label={`Seguir en ${social}`}
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-bold text-foreground">{title}</h4>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-secondary/20 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 LAIDA. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hecho con</span>
            <span className="text-secondary font-bold text-sm">&#9829;</span>
            <span className="text-xs text-muted-foreground">para PyMEs</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
