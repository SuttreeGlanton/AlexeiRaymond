# From the Commonplace

The About page reads its collection from `src/data/commonplace.json`. A separate Word file containing only new passages or named corrections is enough for each update.

- Match the author by name, then the work by title and translator. Append each new passage once. Add an author or work when needed. Keep different translations under separate work records.
- Preserve the supplied text, dialogue punctuation, paragraph breaks and emphasis. Inside a JSON passage use `\n` for a deliberate line break, `\n\n` for a paragraph and `*text*` for italics. An optional `[[more]]` marks the fold without changing the full passage.
- An `(SS)` title in the manuscript becomes a work with `"kind": "story"`. Supply `collection`, `translator`, `edition` and `source` on the work when known. The credit uses quotation marks for stories, italics for books and an inline translator credit.
- For a corrected attribution, move the existing passage to the correct work and check for a duplicate. The reader derives its shuffle directly from the bank.
