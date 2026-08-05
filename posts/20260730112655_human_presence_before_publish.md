# Proof of Presence
**Licence:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — credit Andrei Makarov / amkisko

URL: https://amkisko.github.io/posts/20260730112655_human_presence_before_publish.html
Description: A first-person account of developing registry mutation authorization for Cargo and crates.io, from passkey experiments to a preflight protocol and three RFC drafts.
Published: 2026-07-30T11:26:55+00:00
Modified: 2026-08-01T18:19:00+00:00

---

## The gap I wanted to understand

I began with a mismatch between the care we put into signing in and the authority we hand to a session or API token afterwards. crates.io has made that token less powerful than it once was: it can be scoped to particular crates and operations, it expires by default, and Cargo can ask an operating-system credential provider to store it, while Trusted Publishing can avoid a persistent CI secret altogether.

But a valid bearer credential still answers a different question from the one I care about. It identifies an account; it does not show that an owner is present and intends this particular publish or security change. Issue #13367 (https://github.com/rust-lang/crates.io/issues/13367) made the distinction concrete in 2026 by describing how a compromised authenticated session might be used to weaken a crate’s Trusted Publishing protection and publish with a newly created token. The scenario depends on sensitive transitions accepting the existing session without asking the owner to return through a separate credential.

That is the gap I use “proof of presence” to name. It is narrower than general account security and narrower than supply-chain security. I wanted to see whether crates.io could require fresh, operation-bound evidence from the owner when a reusable credential reaches a high-risk transition, while preserving the non-interactive path that release automation needs.

## What the record changed for me

I first expected to find one proposal that had stalled. Instead I found the same concern splitting into several different problems over more than a decade: web login, Cargo credentials, unattended CI, account recovery, artifact signing, and the integrity of the registry itself. They are related, but a mechanism designed for one does not automatically solve the others.

Issue #815 (https://github.com/rust-lang/crates.io/issues/815) has remained open since 2017. Of its suggested protections, publication email was eventually delivered; website confirmation, two-factor requirements for important crates, and second-maintainer confirmation remain open ideas. The long 2018 discussion about requiring 2FA (https://internals.rust-lang.org/t/requiring-2fa-to-publish-to-crates-io/7931) surfaced the hard parts early: headless publishing, CI, recovery, accessibility, compromised developer machines, and the limited value of a TOTP code typed into such a machine. It ended without an accepted protocol or policy.

What changed my view most was the amount of incremental work that did ship. Scoped API tokens arrived after several years; in its account of that work (https://blog.rust-lang.org/inside-rust/2023/05/09/api-token-scopes/), the project says competing priorities delayed it until Rust Foundation-funded engineering resumed it. Cargo gained safer credential providers, while the February 2025 development update (https://blog.rust-lang.org/2025/02/05/crates-io-development-update/) records publication emails and a default 90-day lifetime for new tokens. Trusted Publishing (https://rust-lang.github.io/rfcs/3691-trusted-publishing-cratesio.html) then gave supported CI systems short-lived authority derived from OIDC, while `trustpub_only` let owners refuse ordinary token publication. I came away seeing a small team reducing risk layer by layer, not a team that had forgotten or rejected MFA.

The signing and registry-integrity work belongs beside this history, but not inside the same claim. RFC #2474 (https://github.com/rust-lang/rfcs/pull/2474), about signing the registry index, was postponed when the Cargo team said it lacked review bandwidth. The older TUF issue (https://github.com/rust-lang/crates.io/issues/75) was later closed in favor of the still-open RFC #3724 (https://github.com/rust-lang/rfcs/pull/3724); that closure did not mean TUF had been deployed. TUF is concerned with what clients can trust when registry or distribution infrastructure is compromised. Step-up authentication is concerned with what the registry should accept from a valid owner credential. They are complementary, and the TUF RFC explicitly leaves crate-owner account compromise outside its direct scope.

After checking the upstream implementation and public record, I could not find a production transaction-level step-up mechanism for publishing or for changing the security configuration that permits publishing as of 30 July 2026. That more precise boundary became the starting point for my prototype.

## Following a publish request

I built the idea as two connected sketches: opt-in passkey MFA in crates.io and an additional-authentication handshake in Cargo. On the registry side, an owner enrolls a passkey and chooses to protect sensitive changes. A recent browser authorization can cover website actions for a short period. When Cargo makes the same kind of change, the registry rejects the first request with a structured challenge rather than treating the token as sufficient:

`{
  "errors": [{
    "detail": "Additional authentication is required",
    "id": "step_up_required",
    "interaction": "browser",
    "challenge_id": "stp_…",
    "verification_url": "https://crates.io/verify/stp_…",
    "poll_url": "https://crates.io/api/v1/auth/challenges/stp_…"
  }]
}`

Working through the Cargo side made the proposal much more concrete. Cargo recognizes `step_up_required`, opens a short-lived listener on the loopback interface when possible, and sends the owner to the verification URL. The browser completes WebAuthn and returns a one-time value to the Cargo process, which retries the original request with `Crates-OTP`. Cargo never receives the passkey material; it only receives proof that this particular challenge was completed.

A localhost callback is comfortable when Cargo and the browser run on the same machine, but that assumption falls apart over SSH or on a remote development host. For those cases I kept a polling path: the owner opens the verification page on another device, completes the passkey check, and Cargo learns that the challenge has been approved. I arrived at localhost first and polling second after reading about the options RubyGems considered for WebAuthn MFA in its CLI. Their experience was a reminder that this is ordinary command-line plumbing with awkward real-world environments, not a place where novelty is valuable.

The distinction between interactive use and automation also became clearer while I was implementing the flow. Trusted Publishing should remain the preferred route for CI, where the workload can present an OIDC identity and no person is waiting at a terminal. A CI job that receives `step_up_required` should stop with an explanation instead of waiting for a browser interaction that will never happen. Reusable API tokens, by contrast, are precisely where a fresh passkey check adds something that the bearer token cannot prove.

## The parts around the passkey

At first the browser ceremony occupied most of my attention. The prototype quickly showed me that enrollment, recovery, and visibility deserve at least as much design work. A stolen browser session must not be able to enroll an attacker’s passkey and enable enforcement, so setup and recovery need a verified-email check. Changing the recovery address needs confirmation from both the old and new addresses. Owners need notifications when MFA settings change, a way to invalidate existing sessions, and a short-lived activity record that lets them recognize actions they did not take.

Those records introduce a different responsibility. Even truncated IP addresses and briefly retained security events are personal data, so a production rollout would need privacy review and notice changes rather than treating the activity page as a harmless extra. This was one of the useful consequences of building more than the successful publish demo: it exposed operational and policy work that is easy to omit from an API proposal.

The challenge itself also needs narrower boundaries than my first description suggested. A callback listener must accept only loopback traffic and expire with the challenge. A polling URL must share the registry API’s origin. The resulting grant must be bound to the token, operation, crate, and publication metadata that created it; otherwise an approval could be replayed or redirected towards a different mutation. The verification page should show that context so an owner can recognize a misleading request. None of this prevents a person from approving a convincing prompt, but it reduces the value of a stolen token or session on its own.

I also had to separate adjacent security ideas that initially looked as though they might belong together. An SSH public key is still a possession credential and may be used through an agent without human interaction, so I do not consider it a substitute for the passkey step. Email OTP is useful for enrollment and recovery, but I would not use it to authorize every publish. Package signing and consumer-facing trust signals answer questions about an artifact; this proposal answers whether an account owner returned before the registry accepted a mutation.

That boundary matters in both directions. Step-up authentication can mitigate stolen tokens, stolen sessions, and some remote account takeovers. It cannot protect the registry from a malicious maintainer, a compromised workstation or CI job, a vulnerable dependency, or compromised registry infrastructure. Building it only makes sense if the claim stays that narrow.

## What the prototype looked like at publication

My starting point for review is API-MFA.md (https://github.com/amkisko/crates.io/blob/patch/api-mfa-passkey-verification/docs/API-MFA.md) in my personal crates.io fork. It describes the threat model and protocol, with related notes about activity records and CLI login. The corresponding server code is in the `patch/api-mfa-passkey-verification` (https://github.com/amkisko/crates.io/tree/patch/api-mfa-passkey-verification) branch, and the Cargo client changes are in `feature/crates-io-api-mfa` (https://github.com/amkisko/cargo/tree/feature/crates-io-api-mfa). I kept the Cargo protocol registry-generic because the client should not have to encode crates.io product terminology to handle an additional-authentication challenge.

One compatibility detail influenced that decision. Cargo has historically tolerated some unusual crates.io error responses, so the challenge cannot look like a successful response with extra instructions hidden inside it. In the sketch it is an explicit non-2xx response: the token is valid, but the requested operation is not yet authorized. An older Cargo version therefore fails visibly, while a version that understands the challenge can guide the owner through verification and retry.

The server-side rollout is deliberately reversible. I would begin in staging, keep enrollment opt-in, and separate the switch that enforces challenges from the switches needed to enroll and recover. Enforcement is disabled by default in the branch. If it caused an incident, it could be paused without locking people out of the controls needed to manage their accounts.

Neither branch has been through an upstream crates.io or Cargo security review, and there is no upstream pull request or production deployment. I treat the code as an implementation candidate: concrete enough to test the protocol and expose operational questions, but still subject to changes in threat model, policy, recovery, and maintenance scope.

## Why I am publishing sketches

My first instinct was to make the prototype comprehensive enough to answer every likely review question. That produced working demonstrations of login without printing a token, failure in CI, expired and malformed verification links, and a publish that travels from Cargo through a browser passkey check and back to the upload. It also made the branches much larger than a useful opening contribution.

I do not want to present a large implementation as though the design decision has already been made. My next step is to reduce the work to questions maintainers can answer: whether opt-in step-up authentication belongs in crates.io, which mutations it should protect, and whether Cargo should support a registry-generic challenge. The existing crates.io and Cargo discussions matter more at this stage than the amount of code in my forks.

The most useful outcome of the exercise has been a clearer view of the boundary between a token and a person. The token can identify an account and start a request. A short-lived challenge can ask the owner to return through a separate device-bound credential before the registry accepts the change. I am sharing the sketches so that people can examine this boundary together with its recovery, compatibility, privacy, and maintenance costs before anyone is asked to merge an implementation.

## Update — mutation authorization and preflight

After publishing the article, I opened a Cargo team Zulip discussion (https://rust-lang.zulipchat.com/#narrow/channel/246057-t-cargo/topic/Support.20registry.20step-up.20handshake.20on.20publish.2C.20yank.2C.20and.20own/near/613728786) and continued revising the implementation in the Cargo and crates.io forks. The later protocol differs structurally from the first prototype. That version reacted after an ordinary mutation was rejected with `step_up_required`, then let a browser return a one-time value to Cargo. The current protocol performs an authenticated preflight before Cargo sends the ordinary mutation. Cargo packages the request once and describes the exact operation, request-body digest and size, crate and version, and, for publish, the archive digest and size. The verification page exposes the archive SHA-256 for optional comparison but omits the archive size.

The registry answers that preflight with `ready`, `pending`, or `interaction_required`. A pending record carries bounded plain-text instructions and an independent, same-origin polling capability. Non-interactive automatic use sends `allow_pending: false`, which lets an exempt credential proceed without creating a record that no person will complete. Fallback to the ordinary mutation is defined only for a definitive preflight `404`; transport failures, malformed responses, and other statuses stop the operation.

When the record becomes ready, Cargo obtains its ordinary credential again and sends the byte-identical mutation with `Cargo-Mutation-Id`. The registry checks the credential identity, method, target, media type, content length, raw request digest, and parsed operation against the stored descriptor. This gives the proposal its current name: registry mutation authorization. Step-up authentication remains one policy a registry may apply, and passkeys remain the verification method in the crates.io prototype, but Cargo does not prescribe MFA or interpret an authentication factor.

The localhost mechanism also changed. It no longer returns an OTP or any other mutation authority. The optional callback contains client-generated state and only wakes Cargo so that Cargo can poll immediately; the registry’s server-side grant and a `ready` poll remain authoritative. Polling is therefore a complete core flow for local terminals, SSH, and explicit CI use, while loopback is a latency optimization with separate browser-isolation and Content Security Policy requirements.

I moved the specification work into three draft RFCs on my RFC branch (https://github.com/amkisko/rust-lang-rfcs/tree/cargo-registry-step-up-authentication). The core mutation-authorization proposal (https://github.com/amkisko/rust-lang-rfcs/blob/cargo-registry-step-up-authentication/text/0000-cargo-registry-mutation-authorization.md) defines preflight, polling, exact binding, client modes, inert display of registry instructions, and the final request. The `idempotent-final` proposal (https://github.com/amkisko/rust-lang-rfcs/blob/cargo-registry-step-up-authentication/text/0000-cargo-registry-mutation-idempotency.md) adds receive leases, bounded retry, at-most-once logical execution, and replay of a committed terminal response after response loss. The `loopback-callback` proposal (https://github.com/amkisko/rust-lang-rfcs/blob/cargo-registry-step-up-authentication/text/0000-cargo-registry-loopback-callback.md) defines the wake-only listener and verification-page isolation. Splitting them leaves the poll-based core usable without requiring every registry to implement crash-safe response replay or a browser callback.

The commits after the original article also added protocol versioning, preflight identifiers and retry rules, extension negotiation, response and text-size limits, redaction of poll and callback capabilities, same-origin and no-redirect checks, `Cache-Control: no-store`, terminal-control and bidirectional-text neutralization, transactional outcome storage in the crates.io prototype, and tests for concurrent and response-ambiguous final requests. These branches and RFC files remain personal drafts. They have not been submitted as numbered RFC pull requests, accepted by the Cargo team, or deployed by crates.io.

Sources and related reading:

- crates.io #815 (https://github.com/rust-lang/crates.io/issues/815): Lessons from NPM password vulnerabilities
- Requiring 2FA to publish to crates.io (https://internals.rust-lang.org/t/requiring-2fa-to-publish-to-crates-io/7931)
- RFC #2474 (https://github.com/rust-lang/rfcs/pull/2474): Signing the registry index
- Scoped API tokens (https://blog.rust-lang.org/inside-rust/2023/05/09/api-token-scopes/)
- February 2025 crates.io development update (https://blog.rust-lang.org/2025/02/05/crates-io-development-update/)
- RFC #3691 (https://rust-lang.github.io/rfcs/3691-trusted-publishing-cratesio.html): Trusted Publishing
- crates.io #13367 (https://github.com/rust-lang/crates.io/issues/13367): “Require trusted publishing for all new versions” could be unchecked by compromised user
- RFC #3724 (https://github.com/rust-lang/rfcs/pull/3724): The Update Framework
- Cargo registry authentication (https://doc.rust-lang.org/cargo/reference/registry-authentication.html)
- RubyGems WebAuthn CLI MFA (https://guides.rubygems.org/using-webauthn-mfa-in-command-line/)
- npm 2FA for package publishing (https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)
- Cargo team Zulip discussion (https://rust-lang.zulipchat.com/#narrow/channel/246057-t-cargo/topic/Support.20registry.20step-up.20handshake.20on.20publish.2C.20yank.2C.20and.20own/near/613728786)
- Draft registry mutation-authorization RFCs (https://github.com/amkisko/rust-lang-rfcs/tree/cargo-registry-step-up-authentication)

Visual mark: Rust and Cargo logos © Rust Foundation (https://rustfoundation.org/policy/rust-trademark-policy/), adapted for this page under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
