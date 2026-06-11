# Study 5 — Scale Questions

All items are 7-point scales, one per page. Every rating page shows the
scenario line in gray ("Imagine you are scrolling through social media and you
see a post from **a person you don't know / a brand you are not familiar
with**:") above the assigned post, then the question. The same scenario
sentence also appears on the instructions page.

Items marked with a lead-in show this small gray, left-justified line above
the statement: *"How much do you disagree or agree with the following
statement:"*

| Construct | id | Lead-in | Question | 1 | 7 |
|-----------|----|---------|----------|---|---|
| Cringe | `cringe` | — | How cringe is this post? | Not at all | Extremely |
| Authenticity | `authentic` | — | How authentic does this post feel? | Not at all authentic | Extremely authentic |
| Liking | `liking` | — | How much do you like this post? | Dislike a great deal | Like a great deal |
| Sincerity | `sincere` | ✓ | Whoever posted this seems sincere. | Strongly disagree | Strongly agree |
| Persuasion knowledge | `pk_persuade` | ✓ | It is pretty obvious that whoever posted this is trying to persuade me. | Strongly disagree | Strongly agree |
| Persuasion knowledge | `pk_motive` | ✓ | Whoever posted this has an ulterior motive for posting it. | Strongly disagree | Strongly agree |
| Persuasion knowledge | `pk_ad` | ✓ | This post is basically marketing or an advertisement. | Strongly disagree | Strongly agree |
| Expectations | `expect_better` | ✓ | I expect better from this {person/company}. | Strongly disagree | Strongly agree |
| Expectations | `expect_standard` | ✓ | I hold {people/companies} to a higher standard than this post. | Strongly disagree | Strongly agree |
| Earnestness | `earnest_genuine` | ✓ | Whoever posted this is genuinely, earnestly trying. | Strongly disagree | Strongly agree |
| Earnestness | `earnest_toohard` | ✓ | Whoever posted this is trying too hard. | Strongly disagree | Strongly agree |

`{...}` items substitute the cell's actor noun (person/people vs.
company/companies).

## Order

Cringe is always page 1 (pinned). The remaining 10 items appear on pages 2–11
in a fresh random order per participant; the realized order is recorded in the
`dvOrder` field. Condition (person vs. company) and post (1 of 5) are also
randomized per participant and persist across refreshes. The manipulation
check ("Thinking back to the post you just rated, who posted it?" — An
individual person / A company or brand) always comes after the full battery,
followed by age and gender.

## Sources

- `sincere`, `pk_persuade`, `pk_motive`: adapted from Campbell & Kirmani
  (2000), *Consumers' Use of Persuasion Knowledge*, JCR 27(1), 69–83
  (sincerity scale p. 73 — converted from semantic differential to an
  agree/disagree statement; "trying to persuade" item p. 75; ulterior-motive
  item p. 77). PDF:
  `Literature/Campbell-Kirmani-ConsumersUseOfPersuasionKnowledge-2000.pdf`
- `pk_ad`: recognition-of-advertising tradition (Boerman et al.).
