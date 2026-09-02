# Arquivos estáticos

O que está aqui é servido na raiz do site: `public/logo-dark.png` vira
`/logo-dark.png`. Nada aqui passa por build — o arquivo sai exatamente
como entrou.

## Marca

| Arquivo | Onde é usado |
| --- | --- |
| `logo-dark.png` | Sobre fundo escuro: trilho lateral e cabeçalho do painel |
| `logo-light.png` | Sobre fundo claro: telas que não são o cromo do console |

Preferir SVG a PNG sempre que houver o vetor: a marca aparece em tamanhos
diferentes na interface, e o PNG borra quando cresce.
