# Solving Grape API Logging: The Missing Piece for Structured Logs

URL: https://amkisko.github.io/posts/20251105100000_grape_logging_structured_json.html
Description: Why existing Grape logging solutions fail to provide complete request logging and structured JSON output, and how grape-rails-logger and activesupport-json_logging solve this problem.
Date: 5 November 2025, Helsinki, Åndrei Makarov
Published: 2025-11-05T10:00:00+00:00

---

Document ID: LOG-2025-001
Classification: Technical Investigation
Subject: Grape API logging gaps and structured logging fragmentation in Rails applications

## Problem summary

Observation 1: Rails controllers log automatically. Grape APIs do not. This asymmetry creates blind spots in production monitoring.

Observation 2: Existing Grape logging solutions (grape_logging, grape-middleware-logger) fail to capture final response status codes. They instrument before error handlers execute, recording incorrect statuses when exceptions are rescued and transformed into 200 OK responses.

Observation 3: Even when Grape logging is solved, the problem expands. Modern Rails applications contain multiple logging systems operating independently:

- Sidekiq maintains its own logger for background jobs
- Puma logs server events in a separate format
- OmniAuth, Shrine, Sentry, and other gems each maintain independent logging mechanisms
- ActiveRecord, ActiveJob, ActionMailer each have configurable loggers

Observation 4: Each logger produces different output formats. Rails controllers emit plain text. Sidekiq uses timestamp-prefixed lines. Puma uses bracket-enclosed timestamps. Without unification, correlating events across components becomes impossible.

## Technical Analysis

Root Cause: Grape's middleware stack wraps requests in error handlers. Logging instrumentation must occur after `rescue_from` blocks execute to capture accurate response status codes. Most solutions instrument too early in the request lifecycle.

Secondary Issue: Rails provides no mechanism to automatically unify logger configuration across gems. Each gem's logger must be manually configured to use a shared JSON logger. This configuration step is:

- Easy to forget when adding new gems
- Not documented in most gem READMEs
- Rarely implemented by teams due to perceived complexity

Impact Assessment: Without structured JSON logs, teams cannot:

- Query logs efficiently in Datadog, CloudWatch, or ELK stacks
- Trace requests across Rails controllers, Grape APIs, and Sidekiq jobs using request IDs
- Build dashboards based on structured fields (duration, status codes, database query times)
- Debug production issues that span multiple application components

## Solution Documentation

Component 1: grape-rails-logger
Patches `Grape::Endpoint#build_stack` to instrument requests after error handlers execute. Captures method, path, status, duration, database query metrics, request ID, and filtered parameters. Integrates with Rails' `filter_parameters` configuration automatically.

Component 2: activesupport-json_logging
Provides structured JSON formatter for Rails loggers. Handles hashes, JSON strings, plain strings, and Exception objects. Never raises exceptions from the formatter, ensuring logging failures don't break applications.

Unification Process:
To achieve unified structured logging, configure each gem's logger to use the JSON logger. This includes Sidekiq, Puma, OmniAuth, Shrine, Sentry, and all Rails component loggers. The configuration is manual but necessary—no automated mechanism exists.

## Case Study: Fragmented Logging

Scenario: A production issue requires tracing a request from a Grape API endpoint through a Sidekiq background job.

Without unified logging: Grape endpoint produces no logs. Sidekiq job logs in plain text with different timestamp format. Rails controller logs in yet another format. Request IDs don't propagate. Correlation impossible.

With unified logging: All components emit structured JSON with consistent request IDs. Single query traces the request across all components. Duration metrics reveal bottlenecks. Database query times visible in all logs.

## Conclusion

Grape API logging requires instrumentation at the correct point in the middleware stack. Structured JSON logging requires manual configuration of each gem's logger. These are separate but related problems. Solving both enables true observability in Rails applications.

The gems grape-rails-logger (https://github.com/amkisko/grape-rails-logger.rb) and activesupport-json_logging (https://github.com/amkisko/activesupport-json_logging.rb) provide the necessary components. The manual logger configuration step remains unavoidable but becomes straightforward once the JSON logger is established.

### Related Articles

- Unified Error Reporting: Managing Multiple Services with ActionReporter - Learn how to manage error reporting services alongside structured logging
- Building Extensible Slack Bots with Grape - See how Grape APIs are used in practice with logging and error handling

### References

- grape-rails-logger on GitHub (https://github.com/amkisko/grape-rails-logger.rb)
- activesupport-json_logging on GitHub (https://github.com/amkisko/activesupport-json_logging.rb)
- Grape Framework (https://github.com/ruby-grape/grape)
- Rails Logging Documentation (https://guides.rubyonrails.org/debugging_rails_applications.html#log-files)
