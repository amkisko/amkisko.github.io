# ActiveRecord Model Versioning: A Proposal for ActiveVersion

URL: https://amkisko.github.io/posts/20251111150825_activerecord_model_versioning.html
Description: Exploring a new approach to ActiveRecord versioning with proper schema design, avoiding JSON/YAML storage, and supporting extensibility for i18n, auditing, and draft management.
Date: 11 November 2025, Helsinki, Åndrei Makarov
Published: 2025-11-11T15:08:25+00:00

---

ActiveRecord versioning and internationalization have followed similar paths in the Ruby ecosystem: start simple with JSON or YAML storage in database columns, then struggle with the limitations. JSONB is fun at the start, but becomes painful when you need to query, maintain, or extend functionality. YAML has no native PostgreSQL support. Neither approach scales well for complex requirements like custom attributes, attachments, rich text, or versioning by platform or user role.

I'm proposing a new gem called `active_version` (with the `ActiveVersion` module) that takes a different approach: proper schema design with separate tables for versions, a DSL for building relations and automations, and extensibility as a first-class concern. This post explores the design, requirements, and seeks feedback from the community.

## The Core Problem

Most versioning and i18n gems in Ruby store data as JSON, YAML, or hstore in database columns. This approach has fundamental limitations:

- Query limitations: Searching and filtering across JSONB versions is complex and often inefficient
- Storage constraints: No way to version custom attributes like attachments or rich text fields properly
- Maintenance overhead: JSON/YAML storage makes it difficult to maintain and debug versions
- No PostgreSQL support for YAML: YAML requires application-level parsing, adding complexity
- Schema rigidity: Changes to versioned attributes require application-level migrations, with database-level schema changes intentionally avoided here

The better approach is to have a proper schema—a table schema copy to separate `_translations` or `_versions` tables. This provides:

- Native database queries and indexes
- Support for custom attributes and associations
- Proper foreign key relationships
- Database-level constraints and validations
- Easy maintenance through standard ActiveRecord patterns

## Gem Proposal: ActiveVersion

The `active_version` gem (with the `ActiveVersion` module) would provide a common pattern for versioning with a DSL for building relations and automations between the main record and version records. Extensions and specific functionality could be delivered as separate gems:

- `active_version-i18n` - Locale-based versioning for translations
- `active_version-audit` - Audit logging and change tracking
- `active_version-draft` - Draft management and soft-delete functionality

## Use Cases

### 1. Internationalization (i18n)

Locale versions of models and attributes. Each translation is a version indexed by locale, allowing proper querying and maintenance of multilingual content.

### 2. Versioning and Auditing

Soft-delete, drafts, and logging changes. Versions can be indexed by time, user, or any other dimension. Full object tracking with support for associations and related records.

### 3. Context-Based Versioning

Different versions for different needs: versioning by platform (web, mobile, API), by user role, by A/B test variant, or any other contextual dimension.

## Requirements

Any proposed solution must meet these requirements:

- Easiness of extensibility: The code should be easy to extend and customize
- Easiness of setup: Simple configuration, either through code patching or documented configuration options
- Performance: Fewer performance problems to solve (than more)—design for performance from the start
- Separate tables: Support for partitioning and sharding of version tables
- Custom attributes: Support for attachments, rich text, and other custom attribute types
- PostgreSQL support: Fine if it works only with PostgreSQL—no need to support every database
- No serialization: No JSON, YAML, hstore, or serialization in the core implementation
- Versions of versions: (Optional) Ability to have versions of versions for complex scenarios

## Current Solutions Analysis

### audited

Has a good codebase and clean schema, but:

- Associated audits feature fully blocks adding custom audit tables
- Only tracks changes, not full objects
- Has callbacks support
- No support for custom models or multi-database setup

### paper_trail

Most used versioning gem, but:

- Uses `whodunnit` as a string (not ideal for relationships)
- Not tracking associations and has no idea about related records affected
- No callbacks support
- Supports custom version tables
- Lots of plugins that may not be needed

### hoardable

Also uses `whodunnit` (problematic), but:

- Has callbacks support
- Fixed most JSONB issues by using a different approach
- Customizable due to complete separate models for versions
- Easy to use, but too fresh (new project)

## Design Principles

### Separate Tables, Not Columns

Each versioned model gets a corresponding `_versions` table with the same schema as the main table, plus version-specific metadata (version number, index, timestamps, etc.). This allows:

- Native database queries and joins
- Proper indexing on any attribute
- Foreign key relationships to other tables
- Support for custom attributes and associations

### Index-Based Version Access

Versions should be accessible by index—locale, datetime, string ID, or any other dimension. Console users should be able to fetch versions easily:

```
article.version(locale: 'en')
article.version(at: 1.week.ago)
article.version(platform: 'mobile')
```

### DSL for Relations and Automations

A clean DSL for defining version relationships and automatic behaviors:

```
class Article < ApplicationRecord
  has_versions do
    index_by :locale
    index_by :created_at
    auto_create_draft: true
    track_associations: [:comments, :tags]
  end
end
```

### Extensibility Through Composition

Core functionality in `active_version`, with extensions as separate gems that compose cleanly:

```
# Gemfile
gem 'active_version'
gem 'active_version-i18n'  # For locale-based versioning
gem 'active_version-audit' # For audit logging
```

## Questions for the Community

I'm seeking feedback on several aspects:

- What problems have you had with i18n gems? What features are missing? What's painful to use?
- What problems have you had with versioning/logging gems? What limitations have you hit?
- What would you like to improve or have control over? What customization do you need?
- What is the desired amount of time to spend on solving these problems? One day? Weeks? This helps prioritize features.
- How about maintenance and console interface? What tools would make working with versions easier?

## Console Interface

A good console interface is crucial for maintenance. Users should be able to:

- Fetch versions by index (locale, datetime, etc.)
- Compare versions side-by-side
- Revert to previous versions
- Create new versions from existing ones
- Query versions across models
- Manage version metadata and relationships

## Performance Considerations

Designing for performance from the start:

- Separate tables allow for partitioning and sharding
- Proper indexes on version metadata (locale, timestamp, etc.)
- Lazy loading of version data
- Support for read replicas for version queries
- Efficient queries using native database features

## Next Steps

This is a proposal and a call for feedback. If you've struggled with versioning or i18n in ActiveRecord, I'd love to hear about:

- Your specific use cases and requirements
- Pain points with existing solutions
- Features you'd like to see
- Design concerns or suggestions

The goal is to build a solution that solves real problems with a clean, extensible design. Proper schema design, no JSON/YAML storage, and extensibility as a first-class concern.

If this resonates with your needs, or if you have feedback, please reach out. The best solutions come from understanding real-world problems.

### Related Articles

- Schema and Data Migrations: Why They Should Be Separate - Understanding Rails data management and schema design principles
- Organizing Seeds: From Single File to Structured Directory - Another approach to managing Rails application data
