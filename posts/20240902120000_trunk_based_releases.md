# Trunk-Based Releases: A Practical Guide

URL: https://amkisko.github.io/posts/20240902120000_trunk_based_releases.html
Description: A comprehensive guide to trunk-based development and release management, including branching strategies, automation, and feature flag management.
Date: 2 September 2024, Helsinki, Åndrei Makarov
Published: 2024-09-02T12:00:00+00:00

---

Trunk-based development is a source-control branching model where developers collaborate on code in a single branch called "trunk" (often `main` or `master`). This approach minimizes merge conflicts, reduces integration complexity, and enables continuous delivery. This guide outlines practical guidelines for implementing trunk-based releases in a team environment.

As sources of ideas, you might check out GitHub flow (https://guides.github.com/introduction/flow/) and Trunk-based development (https://trunkbaseddevelopment.com/).

## Basic Guidelines

1. Ticket tracking integration: The changes you implement should be reflected in the ticket tracking system as part of the ticket (description or task).
2. Commit messages: Ensure that commit messages are understandable by the team. You can use lint-staged for automated checking of changes.
3. Branch creation: Push your changes to a separate branch following the branching strategy for naming.
4. Pull requests: Open a PR in GitHub using your working branch. Publish it as a draft if it's work-in-progress, and change the status when work is done.
5. Ticket updates: Update ticket status, add or remove blockers, and write comments when there are changes in progress.
6. Code quality: Ensure that code is automatically checked using `trunk-io`.
7. Testing: Ensure that code is covered with tests using rspec (use `bin/rspec`).
8. PR information: Ensure that PR has enough information and is understandable by the team.
9. Review assignment: Assign reviewers to PR when done.

## Branching Strategy

The preferred branching strategy uses the following conventions:

- `main` - for stable code
- `feature/<title>` - for feature story types
- `patch/<title>` - for bug and chore story types
- `trunk/<title>` - for release-candidate branches (planned releases)

Feature and patch title examples: `feature/user-preferences-v2`, `patch/fix-analytics-caching`.

Trunk branch title examples: `trunk/2021w15`, `trunk/2021-august-pack`.

## Tracking Projects and Subprojects

Use Epics for grouping smaller tasks and for detailed reporting. Create projects in your time tracking system with the same identifier and name as in the ticket tracking system, for example: `PROJECT-12345 User preferences and settings improvements`.

## Tracking Releases Within Schedule

Use `%Yw%W` format for naming milestones which will include sprint (or scheduled internal) product increment. This format represents year and week number, making it easy to track releases chronologically.

## Release Process

Smaller increments should be merged first, with larger increments going later as a possible place for resolving conflicts in one batch. This is not a strict rule and always depends on prioritization.

Trunk branches can first go to production and then be merged to the mainstream branch. This approach allows for testing in production while maintaining a clean main branch.

## Feature Flags

Use `config/features.yml` for tracking the lifetime of feature flags and getting at least some description of each flag:

```
---
user_preferences_v2:
  released_at:
  expires_at: "2025-01-01"
  description: "Enhanced user preferences system"

analytics_dashboard:
  released_at: "2023-11-22"
  expires_at: "2025-01-01"
  description: "Real-time analytics dashboard"
```

A Flipper module extension can enforce feature flag definitions and check release dates:

```
module Flipper
  def self.features_config
    @@features_config ||= YAML.load_file(Rails.root.join("config/features.yml"))
  end

  def self.feature_definition(name)
    config = features_config.fetch(name.to_s)
    check_release!(name, config)
    config
  rescue KeyError
    message = "Feature `#{name}` not found in features.yml"
    Rails.logger.error(message)
    if Rails.env.production?
      ActionReporter.notify(message)
    else
      raise KeyError, message
    end
  end

  def self.check_release!(name, config)
    return if ENV["DISABLE_FLIPPER_CHECKS"].present?

    if config["released_at"]&.to_date&.past? && !Flipper._enabled?(name)
      message = "Feature `#{name}` was released but is not enabled"
      if Rails.env.production?
        ActionReporter.notify(message, context: {name: name, released_at: config["released_at"]})
      elsif Rails.env.development?
        puts message
        _enable(name)
      end
    end
  end
end
```

## Automation

GitHub Actions can automate trunk branch management. The workflow should:

- Check if a PR has a milestone with the correct format (`YYYYwWW`)
- Create or update trunk branches based on milestone titles
- Automatically merge approved PRs into the corresponding trunk branch
- Create trunk pull requests when needed
- Add labels and comments to track trunk integration

The automation workflow monitors pull request reviews and milestones, automatically creating trunk branches named after milestones (e.g., `trunk/2024w36`). When a PR is approved and has a milestone, it merges into the corresponding trunk branch and creates or updates a trunk pull request.

## Benefits of Trunk-Based Development

Trunk-based development offers several advantages:

- Reduced merge conflicts: Frequent integration minimizes the divergence between branches
- Faster feedback: Code is integrated and tested continuously
- Simpler workflow: Less branching complexity means less cognitive overhead
- Better collaboration: Team members work on the same codebase, making collaboration easier
- Continuous delivery: Small, frequent changes enable continuous deployment

## Best Practices

- Keep branches short-lived (hours or days, not weeks)
- Merge small, incremental changes frequently
- Use feature flags to control feature rollout
- Automate as much of the process as possible
- Maintain clear communication through commit messages and PR descriptions
- Ensure all code is tested before merging

Trunk-based development requires discipline and good tooling, but when implemented correctly, it enables teams to deliver value faster and with higher quality.

### Related Articles

- The Force Push Debate: When to Rewrite VCS History - Understanding when and how to safely rewrite Git history
