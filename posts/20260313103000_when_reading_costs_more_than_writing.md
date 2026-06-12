# When Reading Costs More Than Writing

URL: https://amkisko.github.io/posts/20260313103000_when_reading_costs_more_than_writing.html
Description: An observation from 2023-2026: generated commit messages and review artifacts can become cheaper to produce than to read, shifting software practice toward local generation, manual verification, and selective trust.
Date: 13 March 2026, Helsinki, Åndrei Makarov
Published: 2026-03-13T10:30:00+00:00

---

 13 March 2026, Helsinki, Åndrei Makarov
 eleven pm · four sentences · wrong branch

# When Reading Costs More Than Writing

I was diffing a pull request late when the commit message arrived: four perfect sentences, each describing a change I had not made, and I spent longer reading it than writing a replacement by hand.

At first this showed up only in occasional commits, then it became a stable branch in daily practice where the decision tree stopped being ideological and became practical, because according to the shape of the diff I either use a free commit message generator, or write it manually, or in rare cases ask the chatbot window for a draft, and every branch of that tree is now chosen by reading cost, not by novelty or tool preference.

The stranger part came later when the same pattern started appearing in review, where the old assumption said production should be expensive and consumption should be cheap, yet in LLM-heavy workflows production became almost free while reading stayed cognitively expensive, which means that in some sessions it feels cheaper to regenerate and inspect locally on your own machine than to parse someone else's generated explanation line by line, read-by-read.

This sounds irrational until you watch it for long enough across real projects, because once artifact generation is abundant the bottleneck moves to verification attention, and verification attention is still human, still finite, still metabolically costly, so the center of gravity shifts from "can we produce" to "can we trust what we produced without paying more to read it than to make another candidate".

Last week the same thing happened in review: a colleague pasted a generated summary of their diff, fluent and orderly, and I caught myself skimming for the shape of competence instead of the shape of the change, then checked out the branch locally because my own eyes were cheaper than trusting the paragraph.

In that landscape commit messages become a small laboratory for a larger transition, with readable truth gradually separating from fluent output, and the practical response becomes selective trust where machines can draft aggressively but humans keep final authorship at the points where intent and accountability must stay legible.

I have watched this repeat across projects since 2023, and I still do not know whether reading will get cheaper or whether we are simply learning to generate faster than we can afford to verify.
