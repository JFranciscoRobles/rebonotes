# Files in a page

Put a file in a page with `/file`, by pasting it, or by dropping it on the page. It shows as a card with its name, to open or download it, and the file itself under it when it can be shown:

| File | Shown by |
| --- | --- |
| `.xlsx`, `.csv` | Rebosheets' viewer: the grid and its sheets, read only. |
| `.reboslides` | ReboSlides' viewer: the slides, to go through and present. |
| `.docx` | Rebodocs' viewer: its pages as they print. |
| PDF, video, sound | The browser. |
| YouTube, Vimeo | Their player (`/embed`, with the address). |

The viewers of the suite are formats you give the notes, each loaded the first time a file of its kind is shown, so that notes without them do not carry their engines:

```ts
import { docsFormat } from '@rebonotes/editor/rebodocs';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';
import { slidesFormat } from '@rebonotes/editor/reboslides';

mountNotes(element, { formats: [sheetsFormat, slidesFormat, docsFormat] });
```

A format of your own is `{ test(file), view(element, bytes, { language }) }`, giving back `{ destroy() }`.

## Where files are kept

With nothing said, a file is kept in the page as a `data:` address: the page carries it, and so does its Markdown. For real use, say where files go:

```ts
mountNotes(element, {
  uploadFile: async (file) => (await upload(file)).url,
  uploadImage: async (file) => (await upload(file)).url,
});
```

## Size

Images and files have handles on their sides to make them narrower or wider, kept in the middle of the page; files shown have one under them for their height. The size is kept in Markdown: `![[Budget.xlsx|Budget.xlsx|80%x520]]`.
