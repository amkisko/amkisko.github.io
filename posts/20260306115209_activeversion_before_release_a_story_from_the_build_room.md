# ActiveVersion Before Release: A Story from the Build Room

URL: https://amkisko.github.io/posts/20260306115209_activeversion_before_release_a_story_from_the_build_room.html
Description: A release-week story of active_version.rb: from proposal to implementation, what is stable, and how Rails multi-db patterns shape the next steps.
Date: 6 March 2026, Helsinki, Åndrei Makarov
Published: 2026-03-06T09:52:09+00:00

---

The first story was a proposal, while this one takes place in the release room where design claims are measured against running code, migration paths, and operational behavior that other teams can depend on.

In November 2025, I outlined a direction for Rails versioning based on real schema design, no mandatory JSON/YAML dependence in the core, and a unified architecture for translations, revisions, and audits; today, that direction has moved from argument to implementation in a form that can be tested, migrated, and operated.

## What Changed Since the First Story

Then: a design argument.
Now: a working gem with modules, generators, integration tests, migration documentation, and demo app behavior that can be inspected directly.

`active_version.rb` now ships a unified architecture for:

- translations (`has_translations`)
- revisions (`has_revisions`)
- audits (`has_audits`)

The implementation also includes optional PostgreSQL triggers, shard-aware routing, migration helpers, and query interfaces designed to keep day-to-day API usage readable while preserving low-level control for teams with strict operational constraints.

## The Build Room Checklist

### 1. Stability

Versioning logic is no longer confined to one storage mode, because the gem supports both JSONB and table-based audit strategies while keeping revisions and translations schema-aligned for predictable querying and maintenance.

### 2. Operability

Generators create repeatable structures, setup documentation covers existing projects, and migration guides provide realistic paths from previous gems so teams can evolve incrementally without rewriting everything by hand.

### 3. Scale Readiness

The architecture is intentionally compatible with partitioning and sharding strategies, which matters most when version tables become the busiest and fastest-growing part of a production system.

## How It Fits Rails Multi-DB Reality

Most real systems eventually split concerns across writers, replicas, and shards, so ActiveVersion is designed for that reality without assuming that one default connection remains sufficient forever.

Rails provides the primitives through `connects_to`, `connected_to`, role switching, and shard-aware routing, and ActiveVersion builds on these mechanisms so version records can be routed explicitly and observed predictably.

```
class Post < ApplicationRecord
  has_revisions
  has_audits shard: :audit_db
end
```

When this model is combined with PostgreSQL partition pruning and explicit retention policies, teams get a practical operating path where history remains available, query paths stay narrow, and storage costs remain visible and predictable.

## Why This Release Matters

The release matters because versioning is where product promises meet database pressure, and legal history, editorial workflow, localization, moderation trails, rollback safety, and support diagnostics all tend to converge in the same data layer.

Designing this layer correctly early removes a class of future emergencies, while weak decisions here usually become long-term friction that is expensive to unwind later.

## And the Elixir Thought

There is also interest in a similar approach for the Elixir ecosystem later, carrying the same principles translated into Ecto-native conventions:

- schema-first version storage
- clear separation of revisions, translations, and audits
- explicit routing in multi-repo / multi-tenant setups
- operational friendliness over abstraction tricks

The Ruby release is the proving ground, and if an Elixir branch is built it should inherit operational lessons, not merely surface-level code shape.

## Final Scene Before Tagging

Release is a contract moment, because behavior becomes expectation and expectation becomes maintenance duty for the whole lifecycle that follows.

ActiveVersion is moving from proposal energy to release discipline; if the first story asked what should exist, this one documents what already works and what must remain reliable when other teams depend on it in production.

### References

- First story: ActiveRecord Model Versioning: A Proposal for ActiveVersion
- active_version.rb repository (https://github.com/amkisko/active_version.rb)
- Rails Guides: Multiple Databases with Active Record (https://guides.rubyonrails.org/active_record_multiple_databases.html)
- Rails Guides: Horizontal Sharding (https://guides.rubyonrails.org/active_record_multiple_databases.html#horizontal-sharding)
- PostgreSQL Documentation: Table Partitioning (https://www.postgresql.org/docs/current/ddl-partitioning.html)
