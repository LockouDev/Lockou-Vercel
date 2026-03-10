function App() {
  return (
    <>
      <div className="noise"></div>

      <main className="page">
        <section className="hero">
          <p className="pill">lockou.vercel.app</p>
          <h1>Seu site oficial já está no ar.</h1>
          <p className="lead">
            Esta é a base do Lockou: visual moderno, rápido e pronto para evoluir
            conforme seus próximos projetos.
          </p>
          <div className="actions">
            <a className="btn primary" href="#sobre">
              Conhecer o site
            </a>
            <a className="btn ghost" href="#react">
              React em ação
            </a>
          </div>
        </section>

        <section id="sobre" className="grid">
          <article className="card">
            <h2>Design limpo</h2>
            <p>Estrutura feita para causar boa primeira impressão em desktop e mobile.</p>
          </article>

          <article className="card">
            <h2>Deploy simples</h2>
            <p>
              Agora com React + Vite, pronto para deploy automático na Vercel sem
              complicação.
            </p>
          </article>

          <article className="card">
            <h2>Pronto para crescer</h2>
            <p>
              Você pode evoluir essa landing para componentes, rotas e páginas novas no
              mesmo projeto.
            </p>
          </article>
        </section>

        <section id="react" className="roadmap">
          <h2>Como usar React daqui pra frente</h2>
          <ol>
            <li>Crie componentes em `src/components` para cada bloco da página.</li>
            <li>Use estado com `useState` e efeitos com `useEffect` quando precisar.</li>
            <li>Quando terminar, rode `npm run build` e faça o deploy na Vercel.</li>
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>
          Lockou • <span>{new Date().getFullYear()}</span>
        </p>
      </footer>
    </>
  );
}

export default App;
