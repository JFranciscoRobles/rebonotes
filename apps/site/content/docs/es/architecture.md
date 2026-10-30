# Cómo funciona

## El motor

Un espacio es una lista de páginas; una página tiene título, icono, la página bajo la que está, y sus bloques uno tras otro. Lo que hay dentro de un elemento de lista o un desplegable son los bloques que le siguen con más sangría (`indent`), como lo escribe Markdown, así que una página siempre es una lista plana y mover un bloque mueve los bloques siguientes con más sangría.

Todo es inmutable. Una edición da una página nueva en la que los bloques que no tocó son los mismos objetos; comparar dos espacios es entonces barato, y los cambios entre ellos (`diffWorkspaces`) son unos pocos bloques. Esos cambios son lo que manda la colaboración, y lo que deshace el historial: aplicados sobre un espacio que otros cambiaron, solo tocan lo que nombran.

## El editor

Cada bloque es un elemento cuyo texto edita el navegador, para que escribir, los acentos, la corrección ortográfica y los teclados de cualquier idioma funcionen como en todos lados. Tras cada entrada, el elemento se lee de vuelta como spans (texto con marcas), y se redibuja solo cuando el navegador creó elementos propios. Lo que no es escribir es del editor: Enter corta un bloque, Retroceso lo une, Tab lo mete, Markdown al inicio de una línea lo convierte en otro tipo.

Las otras apps de la suite dibujan en canvas, porque una página, una celda y una diapositiva tienen medidas exactas. Las notas no: fluyen como una página web, y ser el texto propio del navegador es lo que las hace accesibles y ligeras en un teléfono.

## Bases de datos

Una base de datos es un bloque con una tabla. Sus fórmulas se calculan poniendo las filas en una hoja del motor de Rebosheets, cada columna una columna, y leyendo lo que da cada celda de fórmula: todas las funciones de la hoja de cálculo están ahí, sin escribir nada dos veces.

## Markdown

Markdown es el formato en que se guardan las páginas, no una exportación: lo que el motor lee y escribe de origen. Las decisiones para lo que Markdown no tiene (destacados, desplegables, archivos, bases de datos) son las que ya toman GitHub y Obsidian, para que los archivos se lean bien ahí.
