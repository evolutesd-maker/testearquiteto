# Helena Vasconcelos Arquitetura (site modelo)

Site de demonstração para um escritório de arquitetura. Todos os dados são fictícios.

A página inteira gira em torno de uma planta baixa em SVG fixa ao fundo. Ao rolar, a câmera
(o `viewBox`) viaja pela planta e novas camadas aparecem: móveis, nomes dos cômodos, cotas e eixos.

- `index.html`: planta em SVG e blocos de texto (`data-box` define o enquadramento, `data-pos` o lado do texto)
- `styles.css`: tokens, tipografia e camadas
- `script.js`: abertura com logo, câmera guiada pelo scroll, escala gráfica

Abrir `index.html` no navegador, sem build.
