# Bases de datos

Una base de datos es una tabla en una página: columnas de un tipo, y filas. Escribe `/base de datos` para una tabla, o `/tablero` para un tablero de tarjetas por estado.

## Columnas

| Tipo | Qué es una celda |
| --- | --- |
| Texto | Cualquier texto. |
| Número | Un número: `1,200`, `$30` y `15%` se leen como números. |
| Selección | Una de las opciones de la columna, en color; una nueva se añade a ellas. |
| Casilla | Marcada o no. |
| Fecha | Un día, como `2026-10-28`. |
| Fórmula | Lo que da una fórmula para la fila. |

El menú de una columna (su icono) cambia su tipo, ordena las filas por ella, la mueve o la elimina. Una celda se edita donde está: Enter baja una fila (y crea una tras la última), Tab avanza.

## Fórmulas

Las fórmulas las calcula el motor de Rebosheets, como una hoja de cálculo: cada fila una fila de una hoja, `[Precio]` la celda de la columna Precio en la misma fila. Se puede usar cualquier función de una hoja de cálculo.

```
=[Precio]*[Unidades]
=IF([Pagado], "pagado", TEXT([Precio]*[Unidades], "$#,##0.00"))
=DATEDIF([Inicio], [Entrega], "d")
```

Una columna que no existe da `#REF!`.

## El tablero

Un tablero muestra las filas como tarjetas en columnas, una por cada opción de una columna de selección (Agrupar por elige cuál). Arrastra una tarjeta a otra columna para cambiar su opción, o añade una en una columna.

## Como Markdown

Una base de datos se escribe como tabla, como la escribe GitHub, con lo que son sus columnas en un comentario antes. Los valores de las fórmulas también se escriben, para que la tabla se lea bien en cualquier lado.

```md
<!-- rebonotes:database {"columns":[{"name":"Artículo","type":"text"},{"name":"Precio","type":"number"},{"name":"Unidades","type":"number"},{"name":"Total","type":"formula","formula":"=[Precio]*[Unidades]"}]} -->
| Artículo | Precio | Unidades | Total |
| --- | ---: | ---: | ---: |
| Papel | 12.5 | 4 | 50 |
```

## En código

```ts
import { addColumn, addRow, computeFormulas, createTable, setCell } from '@rebonotes/core';

let table = addColumn(createTable('Artículo'), { name: 'Precio', type: 'number' });
const { table: next, row } = addRow(table);
table = setCell(next, row.id, table.columns[1].id, '12.5');
```

## Funciones {#functions}

<!-- functions -->
