function App() {
  return (
    <>
      <div className="starfield" aria-hidden="true"></div>
      <div className="galaxy-glow glow-left" aria-hidden="true"></div>
      <div className="galaxy-glow glow-right" aria-hidden="true"></div>

      <header className="site-header">
        <div className="header-shell">
          <a className="brand" href="#inicio">
            <span className="brand-dot" aria-hidden="true"></span>
            Lockou
          </a>

          <nav className="nav-links" aria-label="Navegação principal">
            <a href="#inicio">Início</a>
            <a href="#sobre">Sobre</a>
            <a href="#contatos">Contatos</a>
            <a href="#portfolio">Portfólio</a>
          </nav>

          <a className="header-cta" href="#contatos">
            Lockou
          </a>
        </div>
      </header>

      <main className="page">
        <section id="inicio" className="panel hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">LOCKOU</p>
              <h1 className="hero-title">
                <span>Scripter</span>
                <span>LockouDev</span>
              </h1>

              <div className="hero-actions">
                <a className="btn btn-primary" href="#portfolio">
                  Ver Portfólio
                </a>
                <a className="btn btn-outline" href="#contatos">
                  Contatos
                </a>
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="visual-core">
                <img
                  src="/images/icons/LockouAvatar.png"
                  alt=""
                  className="avatar-core"
                />
              </div>

              <div className="visual-line line-top"></div>
              <div className="visual-line line-left"></div>
              <div className="visual-line line-right"></div>
              <div className="visual-line line-bottom"></div>
            </div>
          </div>
        </section>

        <section id="sobre" className="panel section">
          <header className="section-head">
            <h2>Sobre</h2>
            <p>Website pessoal do Lockou</p>
          </header>
        </section>

        <section id="portfolio" className="panel section">
          <header className="section-head">
            <h2>Portfólio</h2>
            <p>Em atualização</p>
          </header>
        </section>

        <section id="contatos" className="panel section contact">
          <header className="section-head">
            <h2>Contatos</h2>
          </header>

          <ul className="contact-list">
            <li>
              <i className="bi bi-envelope-fill contact-icon" aria-hidden="true"></i>
              <div className="contact-content">
                <span>Email</span>
                <a href="mailto:kaiojeffoficial@gmail.com">
                  kaiojeffoficial@gmail.com
                </a>
              </div>
            </li>
            <li>
              <i className="bi bi-twitter-x contact-icon" aria-hidden="true"></i>
              <div className="contact-content">
                <span>X [Twitter]</span>
                <a href="https://x.com/LockouRBLX" target="_blank" rel="noreferrer">
                  https://x.com/LockouRBLX
                </a>
              </div>
            </li>
            <li>
              <span className="contact-icon" aria-hidden="true">
                <img
                  width="50"
                  height="50"
                  src="https://img.icons8.com/ios-filled/50/4ea9ff/roblox.png"
                  alt="roblox"
                  className="contact-icon-image"
                />
              </span>
              <div className="contact-content">
                <span>Roblox</span>
                <a
                  href="https://www.roblox.com/users/89879612/profile"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://www.roblox.com/users/89879612/profile
                </a>
              </div>
            </li>
            <li>
              <i className="bi bi-discord contact-icon" aria-hidden="true"></i>
              <div className="contact-content">
                <span>Discord</span>
                <strong>lockou</strong>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>Lockou • {new Date().getFullYear()}</p>
      </footer>
    </>
  );
}

export default App;
