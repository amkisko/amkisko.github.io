# Organizing Seeds: From Single File to Structured Directory

URL: https://amkisko.github.io/posts/20251104130000_seed_builder_organized_seeds.html
Description: How SeedBuilder extends ActiveRecord to organize seeds in a directory structure and generate them as migrations, solving the problem of managing seed data in Rails applications.
Date: 4 November 2025, Helsinki, Åndrei Makarov
Published: 2025-11-04T13:00:00+00:00

---

# Organizing Seeds: From Single File to Structured Directory with SeedBuilder

In the Rails ecosystem, seeds exist in a liminal space. They're not migrations—they don't change structure. They're not application code—they don't run in production. They're data scripts that populate databases with initial content, and Rails provides exactly one mechanism for them: a single file called `db/seeds.rb`.

For small applications, this works. You open the file, add a few `User.create!` calls, run `rails db:seed`, and you're done. But as applications grow, this single file becomes a repository of everything: users, products, settings, categories, permissions, demo data, test fixtures. All mixed together, unorganized, unversioned, untestable.

SeedBuilder observes this pattern and offers an alternative. It extends ActiveRecord to organize seeds in a directory structure, similar to how migrations are organized. Each seed becomes a timestamped file with a class-based structure. You can run all seeds or specific ones. You can generate new seeds with Rails generators. The single file remains supported for backward compatibility, but the directory structure provides organization at scale.

## Observing the Single File Pattern

Watch a Rails developer work with seeds in a growing application. They open `db/seeds.rb`, scroll past hundreds of lines, find the section they need (or create a new one), add their seed data, save, and run the seed command. If another developer is working on seeds simultaneously, merge conflicts are inevitable. There's no way to see when a seed was added, what it does, or whether it's still needed.

The file grows organically, accumulating seed data without structure. User seeds appear at the top. Product seeds appear later. Settings seeds appear at the bottom. Comments attempt to organize sections, but comments are easily ignored or removed. There's no enforcement of organization, no versioning, no selective execution.

When a developer needs to re-seed just users, they must run all seeds. When they need to test a specific seed, they must extract it from the monolithic file. When they need to understand the history of seed data, they must read through git history of a single file, parsing changes that may span hundreds of lines.

## The Migration Pattern as Reference

Rails developers are already familiar with a pattern that solves similar problems: migrations. Migrations are organized in a directory (`db/migrate`), each file is timestamped, each migration is a class with a `change` method, and you can run specific migrations or all of them. This pattern works well for structural changes.

SeedBuilder applies the same pattern to seed data. Seeds live in `db/seeds`, each file is timestamped, each seed is a plain Ruby class with a `change` method. The structure is familiar, the execution model is familiar, the organization is familiar. Developers don't need to learn a new pattern—they already know this one.

The gem automatically patches `Rails.application.load_seed` via Railtie, so existing commands like `rails db:seed` continue to work. The default `db/seeds.rb` file is still loaded first (if enabled), then all seeds from the directory are loaded in timestamp order. This backward compatibility ensures existing workflows don't break.

## The Class-Based Ritual

Each seed is a plain Ruby class. No base class, no inheritance, no framework dependencies beyond the `change` method. SeedBuilder loads the file, instantiates the class, calls `change`, and logs the execution. The class structure provides testability—you can instantiate the class and call `change` in tests. It provides organization—each seed is self-contained. It provides versioning—the timestamp in the filename shows when the seed was created.

When you generate a new seed with `rails g seed create_users`, the generator creates a file with the proper structure and timestamp. By default, it also includes an in-file RSpec test, embedded directly in the seed file. This test can be run independently, providing a way to verify seed logic without running the entire seed suite.

The generator follows the same pattern as the migration generator. Developers already know how to use it. The output follows the same conventions. The workflow is identical. Only the purpose differs—structure versus content.

## Selective Execution as Practice

In development, you might need to re-seed just users without touching products or settings. With a single file, this is impossible. With SeedBuilder, you run `rails seed:run[create_users]` and only that seed executes.

The command accepts multiple name formats: class names, full names with timestamps, or timestamps alone. If multiple seeds match the same name, SeedBuilder shows an error listing all matches and prompts you to be more specific. This prevents accidental execution of the wrong seed.

This selective execution enables workflows that weren't possible with a single file. You can test individual seeds. You can re-seed specific data domains. You can understand what each seed does by examining it in isolation. The monolithic file becomes a collection of independent, executable units.

## Integration Without Disruption

SeedBuilder integrates with Rails' logging infrastructure automatically. All seed-related log messages are tagged with `[seed]`, making them easy to filter in logs. The logger is automatically wrapped with `ActiveSupport::TaggedLogging` if needed, ensuring tags propagate correctly.

Before running seeds, the framework clears the schema cache and resets column information for all models. This ensures seeds work with the latest schema, even if the schema has changed since the last seed run. The framework uses `load` instead of `require` to allow seed files to be re-executed on each run.

Error handling provides clear messages for validation failures and other errors. When a seed fails, you see which seed failed, what the error was, and where it occurred. This visibility is crucial for debugging seed issues in development and staging environments.

## The Migration Path

Teams adopting SeedBuilder don't need to migrate everything at once. The default `db/seeds.rb` file continues to work. New seeds can be added to the directory structure. Over time, teams can migrate existing seeds from the single file to the directory structure, or leave the single file for simple seeds and use the directory for complex, versioned seeds.

This gradual migration path reduces friction. Teams can adopt SeedBuilder incrementally, learning the patterns as they go. The backward compatibility ensures existing workflows continue to function while new workflows become available.

## Conclusion

SeedBuilder observes the Rails ecosystem's patterns and applies them to seed data. The migration pattern, familiar to all Rails developers, becomes the organizing principle for seeds. The single file remains supported, but the directory structure provides organization at scale.

The framework integrates seamlessly with Rails' infrastructure—logging, schema management, generators, Railtie hooks. It doesn't disrupt existing workflows. It adds capabilities: selective execution, versioning, testability, organization. These capabilities become valuable as applications grow and seed data becomes more complex.

For teams managing seed data in growing applications, SeedBuilder provides structure without breaking existing patterns. The single file works for simple cases. The directory structure works for complex cases. Both coexist, and teams can choose the appropriate tool for each seed.

### Related Articles

- Schema and Data Migrations: Why They Should Be Separate - Understanding the distinction between structure and content in Rails data management
- ActiveRecord Model Versioning: A Proposal for ActiveVersion - Learn about versioning strategies for ActiveRecord models

### References

- SeedBuilder on GitHub (https://github.com/amkisko/seed_builder.rb)
- Rails Active Record Migrations Guide (https://guides.rubyonrails.org/active_record_migrations.html)
- Rails Active Record Basics (https://guides.rubyonrails.org/active_record_basics.html)
