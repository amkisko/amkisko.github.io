# Schema and Data Migrations: Why They Should Be Separate

URL: https://amkisko.github.io/posts/20251103110000_data_migrations_separate.html
Description: Why schema migrations and data migrations are fundamentally different and should be managed separately, with best practices for implementing data migrations in Rails.
Date: 3 November 2025, Helsinki, Åndrei Makarov
Published: 2025-11-03T11:00:00+00:00

---

Rails developers have been mixing schema and data migrations for years, and the results are predictably disastrous. The framework provides excellent tooling for structural changes—adding columns, creating tables, modifying indexes. But when developers use the same mechanism for data transformations, they create operational nightmares that compound over time.

Vesa Vänskä's 2014 essay on ActiveRecord migrations best practices (http://vesavanska.com/2014/activerecord-migrations-best-practices) states plainly: "Migrations should not contain seed data." Yet teams continue to bundle data transformations into schema migrations, creating problems that surface during deployments, rollbacks, and database bootstrapping.

## The False Equivalence

Schema migrations and data migrations appear similar—both modify the database, both use timestamped files, both run during deployment. This superficial similarity masks fundamental differences in purpose, execution requirements, and failure modes.

Schema migrations change structure. They should be fast, automatic, and reversible. Data migrations transform content. They may take hours, require operator oversight, and often cannot be reversed. Mixing them creates a category error that manifests as deployment failures, incomplete databases, and impossible rollbacks.

## The Bootstrap Problem

When you run `db:schema:load` to bootstrap a new database, Rails loads only the schema structure. Data migrations bundled into schema migrations never execute. Your database structure exists, but the data remains in its previous state. This breaks applications that assume data transformations have occurred.

Teams discover this when staging environments behave differently than production, or when new developers struggle to set up local databases. The workaround—running all migrations sequentially—defeats the purpose of `schema.rb` as a snapshot of the current database state.

## The Automation Trap

Most CI/CD pipelines automatically run `db:migrate` during deployment. This works for schema changes, which are fast and predictable. Data migrations, however, may require:

- Operator approval before execution
- Specific timing windows (e.g., during low-traffic periods)
- Manual verification of results
- Rollback plans if execution fails

Automating data migrations removes human judgment from critical data transformations. A migration that updates millions of records should not run automatically at 2 AM during a deployment. Yet teams continue to mix data transformations into schema migrations, creating this exact scenario.

## The Transaction Fallacy

Some developers wrap data migrations in transactions, assuming this provides safety. For large data transformations, transactions become memory-intensive and can cause database unresponsiveness. Wrapping a migration that updates ten million records in a transaction may exhaust available memory or lock tables for hours.

Data migrations require batching, progress tracking, and the ability to pause and resume. These requirements conflict with the transaction model that works well for schema changes.

## The Testing Paradox

Rails doesn't test schema migrations by default—they're considered framework-level operations. Data migrations inherit this pattern, but teams often want to test critical data transformations. Mixing schema and data migrations makes it unclear what requires testing and what doesn't.

The data-migration (https://github.com/amkisko/data-migration.rb) gem provides in-file RSpec tests as an option, embedded directly in migration files. This acknowledges that data migrations may need testing while maintaining the Rails convention that migrations themselves aren't part of the main test suite.

## Separation as Principle

Separating schema and data migrations isn't just organizational—it's a recognition that these operations serve different purposes and have different requirements:

- Schema migrations: Fast, automatic, reversible, structural changes
- Data migrations: Potentially slow, operator-controlled, often irreversible, content transformations

The data-migration gem provides a framework that mimics ActiveRecord migrations but is designed for data transformations. It uses plain Ruby classes with a `perform` method, wraps them in ActiveJob for background execution, and tracks them via ActiveRecord models for auditing. This design follows familiar patterns while accommodating the unique requirements of data transformations.

Data migrations should be planned beforehand, scheduled as release events, and executed with operator oversight. They may need batching, pause/resume capabilities, and progress tracking. These features don't belong in schema migrations, which must remain fast and automatic.

## The Practical Alternative

Instead of mixing schema and data, separate them:

Create a schema migration to add the column. Then create a separate data migration to populate it. Run the schema migration automatically during deployment. Run the data migration manually when appropriate, with operator oversight and monitoring.

This separation provides control, visibility, and safety. Schema changes remain fast and automatic. Data transformations remain controlled and observable. Each operation uses the tooling appropriate to its requirements.

## Conclusion

The temptation to mix schema and data migrations stems from convenience—one file, one execution, one commit. But this convenience creates operational debt that compounds over time. Deployment failures, incomplete databases, and impossible rollbacks are the inevitable results.

Separating schema and data migrations requires discipline, but the benefits are immediate: better control over when data transformations execute, proper handling of database bootstrapping, and the ability to test and monitor data migrations independently. The data-migration gem provides the framework needed to implement this separation while maintaining familiar Rails patterns.

As Vänskä noted over a decade ago, migrations should not contain seed data. The same principle applies to all data transformations. Structure and content are different concerns, and they deserve different tooling.

### Related Articles

- Organizing Seeds: From Single File to Structured Directory - Another approach to managing Rails application data and initialization
- ActiveRecord Model Versioning: A Proposal for ActiveVersion - Learn about versioning strategies for ActiveRecord models

### References

- data-migration gem on GitHub (https://github.com/amkisko/data-migration.rb)
- ActiveRecord Migrations Best Practices by Vesa Vänskä (http://vesavanska.com/2014/activerecord-migrations-best-practices)
- Rails Active Record Migrations Guide (https://guides.rubyonrails.org/active_record_migrations.html)
