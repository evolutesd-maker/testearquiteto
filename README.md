# Helena Vasconcelos Arquitetura (site modelo)

Site de demonstração para um escritório de arquitetura. Todos os dados são fictícios.

A página gira em torno de uma maquete 3D de uma casa de 112 m², fixa ao fundo. Ao rolar, a câmera
orbita a casa, desloca-a para o lado oposto ao texto, acende as luzes cômodo a cômodo e abaixa as
paredes voltadas para a câmera.

- `index.html`: estrutura e textos (`data-pos` define o lado do texto, `data-rooms` os cômodos em foco)
- `styles.css`: tokens, tipografia e cartões
- `script.js`: abertura com logo, maquete em Three.js (paredes, pisos, móveis, luzes) e câmera guiada pelo scroll

Abrir `index.html` no navegador, sem build. O Three.js (r128) vem do cdnjs, então precisa de internet.
