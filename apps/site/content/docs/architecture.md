# How it works

## The engine

A workspace is a list of pages; a page has a title, an icon, the page it is under, and its blocks one after another. What is inside a list item or a toggle is the blocks after it set further in (`indent`), as Markdown writes them, so a page is always a flat list and moving a block moves the blocks after it that are further in.

Everything is immutable. An edit gives a new page in which the blocks it did not touch are the same objects; comparing two workspaces is then cheap, and the changes between them (`diffWorkspaces`) are a few blocks. Those changes are what collaboration sends, and what undo takes back: made on a workspace others have changed meanwhile, they touch only what they name.

## The editor

Each block is an element whose text the browser edits, so that typing, accents, spell checking and the keyboards of every language work as they do everywhere. After every input the element is read back into spans (text with marks), and drawn again only when the browser made elements of its own. What is not typing is the editor's: Enter cuts a block, Backspace joins it, Tab sets it in, Markdown at the start of a line turns it into another kind.

The other apps of the suite draw on a canvas, because a page, a cell and a slide have exact measures. Notes do not: they flow like a page of the web, and being the browser's own text is what makes them accessible and light on a phone.

## Databases

A database is a block holding a table. Its formulas are worked out by putting the rows in a sheet of Rebosheets' engine, each column a column, and reading back what each formula cell gives: every function of the spreadsheet is there, with nothing written twice.

## Markdown

Markdown is the format pages are kept in, not an export: what the engine reads and writes by default. The choices for what Markdown has no word for (callouts, toggles, files, databases) are those GitHub and Obsidian already make, so the files read well there.
