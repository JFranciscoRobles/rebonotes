# Archivos en una página

Pon un archivo en una página con `/archivo`, pegándolo, o soltándolo en la página. Se muestra como una tarjeta con su nombre, para abrirlo o descargarlo, y el archivo debajo cuando se puede mostrar:

| Archivo | Lo muestra |
| --- | --- |
| `.xlsx`, `.csv` | El visor de Rebosheets: la cuadrícula y sus hojas, solo lectura. |
| `.reboslides` | El visor de ReboSlides: las diapositivas, para recorrerlas y presentar. |
| `.docx` | El visor de Rebodocs: sus páginas como se imprimen. |
| PDF, video, audio | El navegador. |
| YouTube, Vimeo | Su reproductor (`/insertar enlace`, con la dirección). |

Los visores de la suite son formatos que le das a las notas, cada uno cargado la primera vez que se muestra un archivo de su tipo, para que unas notas sin ellos no carguen sus motores:

```ts
import { docsFormat } from '@rebonotes/editor/rebodocs';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';
import { slidesFormat } from '@rebonotes/editor/reboslides';

mountNotes(element, { formats: [sheetsFormat, slidesFormat, docsFormat] });
```

Un formato propio es `{ test(file), view(element, bytes, { language }) }`, que devuelve `{ destroy() }`.

## Dónde se guardan

Si no se dice nada, un archivo se guarda en la página como dirección `data:`: la página lo lleva, y su Markdown también. Para uso real, di a dónde van:

```ts
mountNotes(element, {
  uploadFile: async (file) => (await subir(file)).url,
  uploadImage: async (file) => (await subir(file)).url,
});
```

## Tamaño

Las imágenes y archivos tienen asas a los lados para hacerlos más angostos o anchos, centrados en la página; los archivos que se muestran tienen una abajo para su altura. El tamaño se guarda en Markdown: `![[Presupuesto.xlsx|Presupuesto.xlsx|80%x520]]`.
