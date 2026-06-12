# Unified Error Reporting: Managing Multiple Services

URL: https://amkisko.github.io/posts/20251105120000_action_reporter_unified_error_reporting.html
Description: How ActionReporter solves the problem of managing multiple error reporting services (Sentry, Honeybadger, Rails logger, etc.) with a single unified interface.
Date: 5 November 2025, Helsinki, Åndrei Makarov
Published: 2025-11-05T12:00:00+00:00

---

# Unified Error Reporting: Managing Multiple Services with ActionReporter

Production Rails apps often run several reporting tools at once: Sentry or Honeybadger for exceptions, Rails logger for development output, Audited or PaperTrail for change history. Each integration needs its own configuration, API calls, and context format. Adding another service repeats the same wiring.

ActionReporter wraps these integrations behind one interface. A single call can report to every configured backend; context set once applies everywhere.

## The Multi-Service Challenge

Production Rails applications typically integrate with multiple reporting and tracking services. Error tracking services like Sentry or Honeybadger monitor exceptions in production. Rails logger provides detailed logs for development. Audit trail gems like Audited or PaperTrail track changes to records. APM tools like Scout monitor performance. Custom internal systems may require their own reporting endpoints.

Each service has different requirements. Sentry expects user objects with specific attributes. Honeybadger uses a different context format. Rails logger accepts plain strings. Audited requires ActiveRecord objects. Without a unified interface, you end up writing the same error reporting logic multiple times, each time adapting it to a different service's API.

Consider setting user context across services. Without ActionReporter, you might write conditional checks for each service, setting context in different formats. If Sentry is present, set its user context. If Honeybadger is present, set its context. If Rails logger is active, log the user information. This approach is verbose, error-prone, and difficult to maintain.

## The Thread Safety Imperative

Modern Rails applications run in multi-threaded environments. Puma, the default Rails server, handles multiple requests concurrently. Each request runs in its own thread, and context set in one thread must not leak into others.

ActionReporter uses thread-local storage to manage context safely. When you set `ActionReporter.current_user`, it's stored in `Thread.current`, isolated from other threads. This ensures that user context set in one request doesn't accidentally appear in another request running concurrently.

This thread safety is crucial for applications that process multiple requests simultaneously. Without it, user context can leak between requests, causing security issues and incorrect audit trails.

## Error Isolation Architecture

ActionReporter wraps each reporter in error handling. If Sentry fails to report an error, Honeybadger and other reporters continue working. Errors in one reporter never break the application or prevent other reporters from functioning.

This isolation is essential in production environments where services may be temporarily unavailable. If Sentry's API is down, your application continues reporting errors to other services. The failure is logged but never propagated, ensuring resilience across the reporting infrastructure.

## Automatic Context Transformation

Different services expect context in different formats. Sentry may need user objects with specific attributes. Honeybadger may need a hash with user IDs. Rails logger may need plain strings. ActionReporter automatically transforms context to match each service's requirements.

You can pass ActiveRecord objects directly to ActionReporter. The framework converts them to GlobalID strings or extracts the necessary attributes, depending on what each service expects. This eliminates the need to manually transform context for each service.

## Transaction Tracking

ActionReporter provides transaction tracking with automatic context preservation. You can set transaction IDs and names that apply to all reporters. When using block-based transactions, previous transaction context is automatically restored after the block completes, ensuring nested transactions don't interfere with each other.

This is particularly useful for tracking requests across multiple services. A single transaction ID can be used to correlate errors, logs, and audit trails across Sentry, Honeybadger, Rails logger, and audit trail systems.

## Extensibility Through Design

ActionReporter's architecture makes it easy to add custom reporters for internal services or new third-party tools. Creating a custom reporter requires inheriting from `ActionReporter::Base` and implementing the `notify` and `context` methods. The framework handles error isolation and context transformation automatically.

The plugin discovery system allows third-party gems to register reporters automatically. When a gem that integrates with ActionReporter is loaded, its reporter becomes available without manual configuration. This makes it easy for gem authors to provide ActionReporter integration while keeping the user experience simple.

## Real-World Impact

In a typical Rails controller, error reporting might involve multiple conditional checks and service-specific API calls. With ActionReporter, a single call to `ActionReporter.notify` reports the error to all configured services with consistent context.

Setting context once applies to all services. User information, request IDs, and remote addresses are set in one place and automatically propagated to Sentry, Honeybadger, Rails logger, and audit trail systems. This reduces code duplication while ensuring consistent context across all reporting services.

## Conclusion

Managing multiple error reporting and tracking services is a common challenge in production Rails applications. ActionReporter solves this by providing a unified interface that works across all services, handles errors gracefully, and maintains thread-safe context management.

Whether you're using Sentry, Honeybadger, Rails logger, Audited, PaperTrail, or custom services, ActionReporter gives you a single API to manage them all. This reduces code duplication, ensures consistent context, and makes it easy to add or remove services as your needs change.

The framework's design prioritizes resilience, thread safety, and extensibility. Error isolation ensures that failures in one service don't affect others. Thread-local storage prevents context leakage in multi-threaded environments. The extensible architecture makes it straightforward to add new reporters as requirements evolve.

For teams building production Rails applications, ActionReporter provides the foundation for unified error reporting. One interface, multiple services, consistent context, resilient architecture. The complexity of managing multiple reporting services disappears, replaced by a simple, unified API that works everywhere.

### Related Articles

- Solving Grape API Logging: The Missing Piece for Structured Logs - Learn about structured logging and how it complements error reporting
- Schema and Data Migrations: Why They Should Be Separate - Understanding Rails data management practices
- Organizing Seeds: From Single File to Structured Directory - Another approach to managing Rails application data

### References

- ActionReporter on GitHub (https://github.com/amkisko/action_reporter.rb)
- Sentry Error Tracking (https://sentry.io)
- Honeybadger Error Monitoring (https://www.honeybadger.io)
- Audited Gem (https://github.com/collectiveidea/audited)
- PaperTrail Gem (https://github.com/paper-trail-gem/paper_trail)
