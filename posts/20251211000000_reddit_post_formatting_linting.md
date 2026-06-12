# Post for Reddit: Robots don't need police: Constraints vs Enforcement and Why linters and formatters shouldn't be in your Gemfile (or how to isolate it)

URL: https://amkisko.github.io/posts/20251211000000_reddit_post_formatting_linting.html
Description: A Reddit-style post discussing the distinction between formatters and linters, and how moving tools out of project dependencies changes the development workflow.
Date: 11 December 2025, Helsinki, Åndrei Makarov
Published: 2025-12-11T00:00:00+00:00

---

r/ruby

•

Posted by

u/amkisko

•

2 hours ago

# Post for Reddit: Robots don't need police: Constraints vs Enforcement and Why linters and formatters shouldn't be in your Gemfile (or how to isolate it)

You ask for conscious decision while there are not much decisions ever made for this area.

There was always an option to not use any formatting automations, it was always available from the beginning. But somewhere along the way, we started treating these tools as mandatory dependencies, as if code couldn't exist without them. This led us down a path where every project carries maintenance debt for tools that aren't even part of the actual application.

When I finally moved linters and formatters out of project dependencies, everything changed. You don't need to add linters and formatters to project dependencies any more, no maintenance debt for these tools. You don't have to run autoformatting on save, which means less interruptions. You don't have to commit formatting and linting changes at the same time as all other changes, resulting in cleaner and more readable commit diffs.

All linters and formatters are isolated within separate environments with version locks and configuration per project. Full support in CI and always possible to replicate and fix things locally.

## Linting is not formatting

This isolation forced me to confront something I'd been ignoring: linting is not formatting. How do you decide if something is a formatter or not? When the package description says "formatter". RuboCop is a tricky example as they marketed it as both linter and formatter (not sure when this change happened). This blurring of boundaries had been creating confusion about what these tools actually do and when they should run.

Once I separated them mentally, the workflow became clearer. When is formatting done? Separate commit. I would personally do formatting as a clean up technique in mainstream, if we agree on format convention. Not much value in spending time figuring out rules or anything else, enforcement is always tricky and leads to creation of police role. Changing things automatically on CI level is tricky, it will lead to unwanted conflicts without somebody's intention. Somebody's intention is crucial as it is related to reporting and responsibility.

With modern code generation capabilities, I don't see any value in formatters (except when they throw errors which might bring useful information), but lots of value in linters as blockers before commit or release. The distinction matters because formatters change code automatically, while linters provide feedback that requires human judgment. One removes agency, the other enhances it.

Interesting turn happens when code generation becomes expensive and we just have to rely more on ready-made open source solutions. This is not the only factor that will form the future as human body has limitations too and we all eventually get tired of over-saturation and over-load of information streams.

## Constraints versus enforcement

This distinction between formatters and linters maps onto a deeper question about how we govern systems: constraints versus enforcement.

Coding is art! Just don't let formatters override your decisions.

Enforcement applies things automatically without asking, using force and overriding decisions. Like police taking someone to jail due to legal decisions — the action is forced and coerced. Although in some countries police also warns before enforcement, this still often produces trauma and fear and reduces deep understanding of why these things exist. Formatters are enforcement: they automatically change code, overriding your decisions without asking. They remove agency by forcing changes.

Constraints are different and operate without direct enforcement. They can be a force that constrains, and that force is sustainable and more durable than one-time enforcement. Like guardrails on a road: they limit what's possible, but don't force you to drive a certain way. Linters are constraints: they provide feedback and flag issues, but don't automatically change code. They preserve agency by allowing you to choose how to respond.

The isolation we're discussing — moving tools out of dependencies — is about finding the right kind of separation. It is isolation from coercive control while preserving relation. Tools that provide feedback without controlling the workflow. This is why linters work better than formatters: they constrain without enforcing, preserving agency while reducing coercive automation.

## The principle

This journey led me to a clear principle: all linters, formatters and code quality tools should be configured per-project and run within isolated environments. They should never appear in project dependencies. They are not mandatory. Code quality automations are not mandatory for coding and delivery. They should never block releases.

But here's the uncomfortable truth: nobody measured these. All the maintenance and debates around formatting-linting-compilation — it's just done because we can't avoid this stuff anymore. Someone has to handle it, and maybe do it for free. Being a "linters expert" is also not much of a good role — not sure if any company is interested in buying such specific services from a person.

Just check out the recent eslint breaking change when they introduced flat config (what?!?) — yes, it costs money! We're spending time and money on tooling maintenance without evidence it improves outcomes.

`#bike-shedding`

## Conclusion

After years of wrestling with this, the code formatting discussion resulted in some conclusions:

- Always prefer committing changes that are only required for the task or story, even if you are the only person who works with the code
- There is a visible price for using different editors and environments
- There is no reason to bring additional and uncontrollable automations
- Never update code text automatically—all automations should be run manually, including formatters, linters, and code generators
- Formatting, linting and running test suites are all developer responsibilities. We have enough tools — one can automate these processes, but there should be no global enforcement. One should be able to not opt for automations, same as being able to opt-in. If one can produce valuable and high quality things without these practices, then what is the value of enforcement for everyone?

This brings us back to the beginning: "Iteration over perfection" and "human over machine". The tools should serve us, not the other way around.

## How to implement this

I wrote a short and complete guide on setting up RuboCop with trunk.io, which implements these principles in practice:

- Tools run in isolated sandbox (not in Gemfile) — no more dependency hell
- Per-project configuration — each project decides what it needs
- CI integration without blocking releases — feedback, not gates

The setup treats linters as what they are: optional tools that provide feedback, not mandatory dependencies that control your workflow. They live in isolation, run when you choose, and don't pollute your project's dependency tree.

Full guide with configurations: https://amkisko.github.io/posts/20251210071732_robots_dont_need_police.html

Yes, this could be part of official trunk.io guidelines, but I don't see any fit there, in the same time I hope after this nobody will struggle with setting it up fully.

## Your turn

What's your take on this? Do you keep linters in dependencies or run them isolated? Have you experienced the maintenance debt from tooling dependencies?

Comment

Share

Save
