# Arquivos estáticos

O que está aqui é servido na raiz do site: `public/logo-dark.png` vira
`/logo-dark.png`. Nada aqui passa por build — o arquivo sai exatamente
como entrou.

## Marca

| Arquivo | Onde é usado |
| --- | --- |
| `logo-dark.jpg` | Sobre fundo escuro: trilho, cabeçalho do painel e login no tema escuro |
| `logo-light.jpg` | Sobre fundo claro: login no tema claro |

Os dois são JPEG, que não tem transparência: cada arquivo traz o próprio fundo.
Por isso `BrandMark` apresenta a marca como bloco arredondado, e não como
símbolo solto — um símbolo tentando se fundir com a superfície atrás deixaria
um quadrado visível de cor errada.

Quando existir o vetor, trocar por SVG: a marca aparece em tamanhos diferentes
na interface, o JPEG borra quando cresce, e o SVG dispensaria os dois arquivos
(uma marca só, recolorida pelo tema).
