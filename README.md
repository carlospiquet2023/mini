# Carlos Piquet Games

Console PWA com sete minijogos, controles por toque/ponteiro/teclado e suporte completo a retrato, paisagem e uso offline.

## Desenvolvimento

Requisitos: Node.js 20+ e Python 3 disponível no `PATH`.

```bash
npm install
npm run serve
```

Abra `http://127.0.0.1:4173`. O PWA deve ser publicado em HTTPS para poder ser instalado fora do ambiente local.

## Validação

```bash
npm test
npm audit
```

A suíte cobre inicialização dos sete jogos, controles unificados, rotação nos dois sentidos, dimensionamento dos canvases e carregamento offline pelo service worker.

## Arquitetura

- `js/GameManager.js`: ciclo de vida e troca dos jogos.
- `js/InputController.js`: teclado, mouse, caneta e toque sem eventos duplicados.
- `js/ViewportManager.js`: viewport visual, rotação e sincronização dos canvases.
- `js/PwaManager.js` e `sw.js`: registro, atualização e cache offline.
- `css/themes.css`, `css/main.css` e `css/animations.css`: tokens visuais, layout/componentes e movimento.
- `tests/app.spec.js`: testes de regressão no Chrome móvel.
