# Robots don't need police!

URL: https://amkisko.github.io/posts/20251210071732_robots_dont_need_police.html
Description: A guide to setting up RuboCop with trunk.io for automated code quality checks in Ruby projects, including configuration examples and GitHub Actions integration.
Date: 10 December 2025, Helsinki, Åndrei Makarov
Published: 2025-12-10T05:17:32+00:00

---

A computer hums and slowly starts; a faint light from the screen illuminates the room. A terminal line appears and waits for the user to type...

This year, many things moved towards automation of text production (lol if you try producing music with LLMs, not lol if it's juggling or skating).

There is one area of text application which is called coding — the practice of typing exact symbols to make something happen. Some programming languages make you wait until you get a dopamine hit; some make it happen faster.

Within rapid development and delivery times, automations require constraints (not police!). The reason for this is hidden in the superpower that with these services and tools, one can produce almost anything (according to the past, for sure).

Something strange happened to most programming language communities and software development in general, as frameworks and libraries do not resolve both problems of good developer experience and good performance.

In the Ruby community, from the early beginning, one of the goals was to bring satisfaction and happiness to developers. This core value still sustains today.

There are few ways to bring constraints to Ruby code. A recent addition is RBS, which helps make typing a contract. Although known tooling like RuboCop is still relevant.

Making RuboCop work in isolation/sandbox is a good idea, but it might be a bit problematic to solve, and that's not the only point, as within an average project we have more languages than one and more environments.

trunk.io helps solve this problem by providing scripts and wrappers for various tools and linters. It gives capabilities for full isolation: `.rubocop.yml` can be fully moved under `.trunk/configs` and there is no need to add gems to the main Gemfile, keeping it clean from these dependencies. All linters run in isolated environments with their own version locks, completely separate from your project's runtime dependencies.

Rule of thumb: Formatting and linting are the developer's responsibility. It is only the developer (and team as a collective of individuals) who decides if code should be formatted or not before committing.

Rule of thumb: Follow conventions, but not blindly.

Getting feedback faster is good, so let's tune RuboCop (based on Standard) to work with trunk.io and have it running in GitHub Actions right now!

Start by tuning `.trunk/trunk.yaml` configuration and run `trunk check` and `trunk upgrade`. Keep an eye on `lint.definitions` configuration. Always monitor trunk activities and configure linters/tools depending on your needs; some tools might affect your computer performance quite heavily.

For the best developer experience, consider installing the trunk.io VSCode extension (https://marketplace.visualstudio.com/items?itemName=trunk.io) (docs (https://docs.trunk.io/code-quality/overview/ide-integration/vscode)), which provides inline recommendations for fixing code issues directly in your editor. This gives you immediate feedback as you write code, without needing to run linters manually. For Neovim users, there's also a Neovim plugin (https://docs.trunk.io/code-quality/overview/ide-integration/neovim) available.

For a quick setup, you can use the setup script to apply all the configurations mentioned in this article.

## Configuration Files

### .trunk/trunk.yaml

```
# This file controls the behavior of Trunk: https://docs.trunk.io/cli
# To learn more about the format of this file, see https://docs.trunk.io/reference/trunk-yaml
version: 0.1
cli:
  version: 1.25.0
# Trunk provides extensibility via plugins. (https://docs.trunk.io/plugins)
plugins:
  sources:
    - id: trunk
      ref: v1.7.4
      uri: https://github.com/trunk-io/plugins
# Many linters and tools depend on runtimes - configure them here. (https://docs.trunk.io/runtimes)
# downloads:
#   - name: custom-ruby-build
#     version: 20241105
#     downloads:
#       - os:
#           linux: linux
#           macos: macos
#         url: https://github.com/rbenv/ruby-build/archive/refs/tags/v20241105.tar.gz
#         strip_components: 1
runtimes:
  # definitions:
  #   - type: ruby
  #     download: custom-ruby-build
  enabled:
    - go@1.21.0
    - node@22.16.0
    - python@3.10.8
    - ruby@>=3.3.0
# This is the section where you manage your linters. (https://docs.trunk.io/check/configuration)
lint:
  disabled:
    - brakeman
    - rufo
    - eslint
    - prettier
    - standardrb
    - semgrep
    - oxipng
    - svgo
    - trufflehog
    - shfmt
    - hadolint
    - trivy
  definitions:
    - name: stylelint
      files: [css]
    - name: rubocop
      extra_packages:
        - standard@1.52.0
        - standard-custom@1.0.2
        - standard-rails@1.5.0
        - standard-performance@1.8.0
        - standard-rspec@0.3.1
        - rubocop-rails@2.34.2
        - rubocop-rspec@3.8.0
        - rubocop-thread_safety@0.7.3
  ignore:
    - linters: [ALL]
      paths:
        - bin/**
        - db/schema.rb
        - vendor/**
        - tmp/**
        - log/**
        - storage/**
        - coverage/**
        - uploads/**
  enabled:
    - biome@2.3.8
    - rubocop@1.81.7
    - stylelint@16.26.1
    - yamllint@1.37.1
    - gitleaks@8.29.0
    - actionlint@1.7.8
    - checkov@3.2.495
    - dotenv-linter@4.0.0
    - git-diff-check
    - markdownlint@0.46.0
    - osv-scanner@2.2.4
    - shellcheck@0.11.0
actions:
  disabled:
    - trunk-announce
    - trunk-check-pre-push
    - trunk-fmt-pre-commit
  enabled:
    - trunk-upgrade-available
```

### Gemfile (Optional)

With trunk.io's full isolation capabilities, you don't need to add these gems to your main Gemfile at all. trunk.io manages all linter dependencies in its own isolated environment. However, if you want to run RuboCop manually outside of trunk.io, you can optionally add development gems to `Gemfile` and run `bundle install`.

```
gem "standard", require: false
gem "standard-custom", require: false
gem "standard-performance", require: false
gem "standard-rails", require: false
gem "standard-rspec", require: false
gem "rubocop-rails", require: false
gem "rubocop-rspec", require: false
gem "rubocop-thread_safety", require: false
```

### .rubocop.yml

You can keep a single `.rubocop.yml` configuration file in your project root, or move it to `.trunk/configs/.rubocop.yml` for complete isolation. Do not use additional `.yml` configurations as it won't work with trunk.io sandbox. When placed in `.trunk/configs/`, the configuration is completely isolated from your project and managed by trunk.io.

```
inherit_mode:
  merge:
    - Exclude

require:
  - standard

plugins:
  - standard-custom
  - standard-performance
  - rubocop-performance
  - rubocop-rails
  - rubocop-rspec
  - rubocop-thread_safety

inherit_gem:
  standard: config/base.yml
  standard-performance: config/base.yml
  standard-custom: config/base.yml
  standard-rails: config/base.yml

AllCops:
  SuggestExtensions: false
  TargetRubyVersion: 3.4
  NewCops: enable
  Exclude:
    - bin/**/*
    - db/**/*
    - vendor/**/*
    - tmp/**/*
    - log/**/*
    - storage/**/*
    - coverage/**/*
    - uploads/**/*
    - .git/**/*
    - node_modules/**/*
    - public/packs/**/*
    - public/packs-test/**/*

# RSpec-specific configuration
RSpec/ExampleLength:
  Max: 50

RSpec/SpecFilePathFormat:
  Enabled: false
  Exclude:
    - spec/**/*

RSpec/HooksBeforeExamples:
  Enabled: false

RSpec/MultipleMemoizedHelpers:
  Max: 16

RSpec/NestedGroups:
  Max: 4

# Custom cop overrides
Style/AccessModifierDeclarations:
  EnforcedStyle: inline

Rails/ActiveRecordCallbacksOrder:
  Enabled: false

Style/FrozenStringLiteralComment:
  Enabled: false

Lint/UselessAssignment:
  Enabled: false

Rails/Exit:
  Exclude:
    - usr/**/*

ThreadSafety/ClassAndModuleAttributes:
  Enabled: false

ThreadSafety/ClassInstanceVariable:
  Enabled: false

ThreadSafety/DirChdir:
  Exclude:
    - "*.gemspec"

# Strict cops that should never be disabled
Lint/Debugger:
  Enabled: true
  Exclude: []

RSpec/Focus:
  Enabled: true
  Exclude: []

Rails/Output:
  Enabled: true
  Exclude:
    - usr/**/*

Rails/FindEach:
  Enabled: true
  Exclude: []

Rails/UniqBeforePluck:
  Enabled: true
  Exclude: []
```

## GitHub Actions Workflow

Finally, let's add a GitHub Actions workflow to run it for all, having `setup-ruby` as just a safe point here.

Create `.github/workflows/_trunk_check.yml`:

```
name: _trunk_check
on: [pull_request]
concurrency:
  group: ${{ github.head_ref || github.run_id }}
  cancel-in-progress: true
permissions: read-all
jobs:
  run_trunk_action:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - uses: trunk-io/trunk-action@v1
```
