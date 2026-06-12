# When Reading Costs More Than Writing

URL: https://amkisko.github.io/posts/20260313103000_when_reading_costs_more_than_writing.html
Description: An observation from 2023-2026: generated commit messages and review artifacts can become cheaper to produce than to read, shifting software practice toward local generation, manual verification, and selective trust.
Date: 13 March 2026, Helsinki, Åndrei Makarov
Published: 2026-03-13T10:30:00+00:00

---

 13 March 2026, Helsinki, Åndrei Makarov
 read_cost > write_cost
verify_attention == scarce

# When Reading Costs More Than Writing

I started treating this as a minor annoyance and ended up recording it as a workflow event: generated commit messages often look acceptable from a distance and expensive up close, so expensive that if I have to read them carefully I can usually write a better one by hand in less time than it takes to verify the generated version.

At first this showed up only in occasional commits, then it became a stable branch in daily practice where the decision tree stopped being ideological and became practical, because according to the shape of the diff I either use a free commit message generator, or write it manually, or in rare cases ask the chatbot window for a draft, and every branch of that tree is now chosen by reading cost, not by novelty or tool preference.

The stranger part came later when the same pattern started appearing in review, where the old assumption said production should be expensive and consumption should be cheap, yet in LLM-heavy workflows production became almost free while reading stayed cognitively expensive, which means that in some sessions it feels cheaper to regenerate and inspect locally on your own machine than to parse someone else's generated explanation line by line, read-by-read.

This sounds irrational until you watch it for long enough across real projects, because once artifact generation is abundant the bottleneck moves to verification attention, and verification attention is still human, still finite, still metabolically costly, so the center of gravity shifts from "can we produce" to "can we trust what we produced without paying more to read it than to make another candidate".

In that landscape commit messages become a small laboratory for a larger transition, with readable truth gradually separating from fluent output, and the practical response becomes selective trust where machines can draft aggressively but humans keep final authorship at the points where intent and accountability must stay legible.

Observation window: this behavior has repeated across multiple projects from 2023 to 2026, and the pattern keeps strengthening as generation speed rises faster than reading reliability.
