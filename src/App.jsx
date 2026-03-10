const portfolioItems = [
  {
    title: "Landing Nebula",
    description: "Composição premium com profundidade visual e foco total na marca pessoal."
  },
  {
    title: "Painel Orbit",
    description: "Blocos conectados para destacar métricas, resultados e atualizações."
  },
  {
    title: "Layout Astral",
    description: "Experiência responsiva com navegação limpa e leitura rápida em qualquer tela."
  }
];

const stats = [
  { value: "100%", label: "Personalizado" },
  { value: "#1A1A1A", label: "Base principal" },
  { value: "Preto + Azul", label: "Estilo galáxia" }
];

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
            <a href="#inicio">Inicio</a>
            <a href="#sobre">Sobre</a>
            <a href="#contatos">Contatos</a>
            <a href="#portfolio">Portofolio</a>
          </nav>

          <a className="header-cta" href="#contatos">
            Vamos criar
          </a>
        </div>
      </header>

      <main className="page">
        <section id="inicio" className="panel hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Website personalizado do Lockou</p>
              <h1>
                Presença digital em modo <span>galáxia azul</span>.
              </h1>
              <p className="hero-text">
                Visual escuro com detalhes técnicos, camada superior em blur e uma
                estética moderna para posicionar seu projeto com identidade forte.
              </p>

              <div className="hero-actions">
                <a className="btn btn-primary" href="#portfolio">
                  Ver portofolio
                </a>
                <a className="btn btn-outline" href="#sobre">
                  Explorar detalhes
                </a>
              </div>

              <div className="metrics">
                {stats.map((item) => (
                  <article key={item.value}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="visual-core">
                <span>L</span>
              </div>

              <div className="visual-line line-top"></div>
              <div className="visual-line line-left"></div>
              <div className="visual-line line-right"></div>
              <div className="visual-line line-bottom"></div>

              <article className="signal-card card-top">
                <p>Camada superior</p>
                <strong>Blur + Transparência</strong>
              </article>

              <article className="signal-card card-left">
                <p>Tema visual</p>
                <strong>Preto e Azul</strong>
              </article>

              <article className="signal-card card-right">
                <p>Identidade</p>
                <strong>Lockou Website</strong>
              </article>

              <article className="signal-card card-bottom">
                <p>Estrutura</p>
                <strong>React + Vite</strong>
              </article>

              <span className="signal-dot dot-top"></span>
              <span className="signal-dot dot-left"></span>
              <span className="signal-dot dot-right"></span>
              <span className="signal-dot dot-bottom"></span>
            </div>
          </div>
        </section>

        <section id="sobre" className="panel section">
          <header className="section-head">
            <h2>Sobre</h2>
            <p>
              Um website de autoria própria com visual refinado para apresentar sua
              identidade na web.
            </p>
          </header>

          <div className="feature-grid">
            <article className="feature-card">
              <h3>Navegação clara</h3>
              <p>
                Topo fixo com efeito glass para manter os links visíveis durante toda a
                navegação.
              </p>
            </article>
            <article className="feature-card">
              <h3>Atmosfera galáctica</h3>
              <p>
                Fundo preto absoluto com brilhos azuis, pontos de luz e profundidade em
                camadas.
              </p>
            </article>
            <article className="feature-card">
              <h3>Pronto para evoluir</h3>
              <p>
                Base organizada para receber animações, integrações e novas páginas no
                futuro.
              </p>
            </article>
          </div>
        </section>

        <section id="portfolio" className="panel section">
          <header className="section-head">
            <h2>Portofolio</h2>
            <p>Projetos com direção visual forte e foco em performance.</p>
          </header>

          <div className="portfolio-grid">
            {portfolioItems.map((item) => (
              <article key={item.title} className="portfolio-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contatos" className="panel section contact">
          <header className="section-head">
            <h2>Contatos</h2>
            <p>Se quiser, transformamos essa base em uma experiência ainda maior.</p>
          </header>

          <div className="contact-links">
            <a href="mailto:contato@lockou.dev">contato@lockou.dev</a>
            <a href="https://lockou.vercel.app" target="_blank" rel="noreferrer">
              lockou.vercel.app
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Lockou • {new Date().getFullYear()}</p>
      </footer>
    </>
  );
}

export default App;
