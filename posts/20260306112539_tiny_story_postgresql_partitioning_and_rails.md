# Tiny story PostgreSQL partitioning and Rails

URL: https://amkisko.github.io/posts/20260306112539_tiny_story_postgresql_partitioning_and_rails.html
Description: A tiny dramatic detective story about PostgreSQL partitioning in Rails, including how it fits with sharding, clustering, replication, and multi-shard operations.
Date: 6 March 2026, Helsinki, Åndrei Makarov
Published: 2026-03-06T09:25:39+00:00

---

A customer enters a library and tries to describe a book without knowing its full title or author name; after a short conversation, we finally get one reliable clue: the author’s last name starts with D. That single signal narrows the search from an entire building to one shelf range between `CA` and `EA`, and the book appears quickly because the lookup path is constrained from the start.

The mechanic version of the same story is equally familiar: when tools are stored by size ranges, finding one key and one screw no longer means searching the whole workshop. This is exactly the intuition behind table partitioning, where the goal is to organize lookup space so reads and writes touch only the smallest necessary slice.

Under the hood, this can always be built manually with separate tables, constraints, triggers, and routing logic in application code, but modern databases such as PostgreSQL provide declarative partitioning features that remove a large amount of repetitive operational work and reduce the chance of human mistakes in production.

## Disclaimer

Partitioning is no universal cure for performance problems, because real bottlenecks still need an involved engineer who understands workload, schema, and query behavior; however, partitioning deserves a permanent place in the toolbox because it reliably reduces search scope when data access follows stable keys.

In many incidents, the database is less the original source of failure and more the place where design weaknesses become visible under concurrency, which is why reducing contention and index pressure can prevent small issues from escalating into service-wide instability.

## Motivation

The typical pain pattern is predictable: read latency starts drifting, writes queue behind locks, and the pressure propagates through the application, while deleting historical data is not an option because those records remain part of business logic and compliance requirements.

Indexes bloat, random lookups in the middle of a huge table become expensive, maintenance windows get longer, and every operation feels like crossing a frozen river in spring.

For many teams, trouble becomes visible around rough thresholds such as `1 GB` for hot tables and around `1,000,000` rows, and although these numbers are not universal limits, they are useful warning lights that often correlate with rising maintenance and lock costs.

## Intention

The intention is simple: split hot data into smaller physical partitions so reads and writes operate on tighter ranges, partition-local indexes stay compact, and latency remains predictable even while the total dataset continues to grow.

The goal is to narrow how much data each query has to touch.

## Requirements

### 1. Stable Separation Key

Partitioning works when records can always be routed by explicit and predictable values, such as first letter, item number range, or event date, because both write paths and read predicates must carry the same key semantics.

```
Event.create!(date: params[:date])
```

If reads also follow date windows (today, calendar pages, cursor by date), this is a strong candidate; if the product frequently requires full scans of all records, partitioning can become a liability because planning and coordination costs grow without giving pruning benefits.

### 2. Maintenance Discipline

Like ordinary tables, partitions evolve through migrations, but production comfort usually requires scheduled maintenance jobs that create future partitions, monitor gaps, and keep routing state aligned with expected input ranges.

A `default` partition should always exist as a controlled sink for records that do not match named partitions at insert time, with a scheduled reconciliation step that moves those orphan rows into proper ranges before they silently accumulate.

### 3. Monitoring

Treat monitoring as mandatory, not optional:

- count of partitions
- rows per partition
- size per partition
- rows in `default` partition

## Limitations

- Full scans get more expensive as partition count grows.
- Manual partition operations are possible in small systems, but automation is the norm in production.
- Composite primary keys must still be globally unique.
- Each partition is an independent table with its own indexes and naming overhead.
- The default partition can silently accumulate debt unless monitored and drained.

## Abilities

- Create partitions in advance using your chosen factor and retention horizon.
- Detach a partition quickly when archive workflows permit it: `DETACH PARTITION`.
- Run maintenance faster on smaller units with `VACUUM` and index work per partition.
- Keep model usage close to ordinary tables while letting the engine route to the correct physical partition.

## State Within Rails

Current practical stack in many teams looks like this:

- `pg_party` can help, but often needs project-specific extensions.
- Custom `PartitionsMaintenanceJob` is usually required.
- Migration from ordinary tables to partitioned tables is scriptable.
- ActiveRecord support around composite keys continues to improve.
- You are still responsible for designing efficient key usage in reads and writes.
- Schema dump exclusions for partition-managed tables are often configured explicitly.

## Sharding, Clustering, Replication

Partitioning and sharding should be seen as complementary layers: partitioning organizes data physically inside one logical database, while sharding distributes storage and traffic across multiple databases or clusters.

In multi-shard systems, partitioning typically exists inside each shard, so request flow should route by shard key first and then rely on partition pruning within that shard to keep query scope narrow and costs predictable.

- Sharding: horizontal split across shards; partitioning can still be used per shard.
- Clustering: multiple nodes for availability/performance; partitions remain regular tables managed by the primary node.
- Replication: read replicas copy partitioned tables like ordinary tables; pruning still helps read queries when predicates are shard- and partition-aware.

The practical rule is that queries must carry both routing signals, shard key and partition key, because losing either one immediately pushes the system toward broad scans and cross-node inefficiency.

On the Rails side, this usually means explicit connection roles and shard routing through `connects_to` and `connected_to`, while on the PostgreSQL side it means choosing partition keys that genuinely match real `WHERE` patterns so pruning happens in production behavior and query plans.

## Final Scene

You can partition almost anything, including designs like `id + JSONB`, but permissibility is not the same as wisdom, and architecture debt is usually paid later through slower operations and harder maintenance.

The real detective work in engineering is not writing clever SQL fragments; it is choosing data boundaries that reflect product behavior and then maintaining those boundaries with discipline as workload evolves.

Keep the notes close to your workload, inspect behavior in production telemetry, and validate assumptions before scaling partition count.

### References

- PostgreSQL Documentation: Table Partitioning (https://www.postgresql.org/docs/current/ddl-partitioning.html)
- PostgreSQL Documentation: Partition Pruning (https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- Rails Guides: Multiple Databases with Active Record (https://guides.rubyonrails.org/active_record_multiple_databases.html)
- Rails Guides: Horizontal Sharding (https://guides.rubyonrails.org/active_record_multiple_databases.html#horizontal-sharding)
- Rails Guides: Manual Connection Switching (https://guides.rubyonrails.org/active_record_multiple_databases.html#using-manual-connection-switching)
- Rails Guides: Composite Primary Keys (https://guides.rubyonrails.org/active_record_composite_primary_keys.html)
- pg_party (https://github.com/rkrage/pg_party)
- Rails Pull Request: Composite primary key improvements (https://github.com/rails/rails/pull/56709)
