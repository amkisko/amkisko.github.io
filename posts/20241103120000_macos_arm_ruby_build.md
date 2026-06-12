# Troubleshooting Version Managers on macOS (Apple Silicon & Intel)

URL: https://amkisko.github.io/posts/20241103120000_macos_arm_ruby_build.html
Description: A comprehensive guide to troubleshooting Ruby and Node.js version managers on macOS, covering rbenv, RVM, nodenv, nvm, asdf, and mise. Learn about common issues and solutions for both Apple Silicon and Intel Macs.
Date: November 3, 2024
Published: 2024-11-03T12:00:00+00:00

---

Using Ruby and Node.js version managers on macOS can be tricky, especially with the transition to Apple Silicon (M1/M2) processors. This guide covers common issues and solutions for rbenv, RVM, nodenv, nvm, asdf, and mise on both ARM and Intel Macs.

## Common Issues with Version Managers

Version managers on macOS often face several challenges:

- Architecture mismatches: Apple Silicon Macs use ARM architecture. While older software was built for Intel (x86_64), it's recommended to use native ARM versions whenever possible and avoid relying on emulation.
- OpenSSL dependencies: Ruby and Node builds often need specific OpenSSL versions, which can be tricky to configure correctly.
- Compilation flags: Older versions may need special compiler flags to build on modern macOS.
- Homebrew paths: Different paths for ARM (`/opt/homebrew`) vs Intel (`/usr/local`) can cause confusion.

## Homebrew and Native ARM Configuration

The first step in troubleshooting is ensuring correct Homebrew setup for ARM:

- Use native ARM Homebrew: On Apple Silicon, ensure you're using the ARM version of Homebrew in `/opt/homebrew`. If you have Intel Homebrew in `/usr/local`, remove it to avoid conflicts.
- Avoid Rosetta and arch commands: Instead of using Rosetta 2 or architecture switching, prefer native ARM versions of software. For older versions that don't support ARM, consider using newer versions that do.
- Install native dependencies: Ensure `openssl`, `readline`, `libffi`, and other build tools are installed via ARM Homebrew.
- Check brew config: Run `brew config` to verify you're using the native ARM version.

## Ruby Version Managers (rbenv, RVM)

Ruby version managers need special attention on Apple Silicon. While rbenv is the recommended modern solution, some developers still use RVM (though it's considered legacy and not recommended for new projects).

### rbenv/ruby-build

For rbenv users (the recommended approach), OpenSSL configuration is crucial:

- Ruby ≥3.1: Use OpenSSL 3 (`brew install openssl@3`)
- Ruby 2.4–3.0: Use OpenSSL 1.1 (`brew install openssl@1.1`)
- Export configuration:
`export RUBY_CONFIGURE_OPTS="--with-openssl-dir=$(brew --prefix openssl@3)" # For Ruby ≥3.1
# OR
export RUBY_CONFIGURE_OPTS="--with-openssl-dir=$(brew --prefix openssl@1.1)" # For Ruby 2.4-3.0`
- Alternative approach - vendored OpenSSL:
Set `RUBY_BUILD_VENDOR_OPENSSL=1` to force ruby-build to compile and vendor its own OpenSSL
This can help avoid system OpenSSL compatibility issues
Takes longer to build but provides more consistent results across different environments
Particularly useful when system OpenSSL causes unexpected issues or when you need a specific OpenSSL version

### RVM Configuration (Legacy)

While RVM is an older solution and not recommended for new projects due to its invasive shell integration and complexity, some legacy projects still use it. If you must use RVM, here's how to configure it:

RVM users should point to Homebrew's OpenSSL:

```
rvm reinstall 3.3.0 --with-openssl-dir=$(brew --prefix openssl@3)
# For older Ruby versions:
rvm reinstall 2.7.2 --with-openssl-dir=$(brew --prefix openssl@1.1)
```

## Node Version Managers (nodenv, nvm)

Node.js version managers have their own considerations. While nodenv is the recommended modern solution following rbenv's proven design, nvm is an older alternative that some projects still use.

### nodenv Configuration (Recommended)

nodenv works similarly to rbenv and is the preferred solution:

- Install latest OpenSSL and pkg-config via Homebrew
- Use Rosetta for older Node versions
- Set appropriate OpenSSL flags if needed
- Supports version override via `NODENV_VERSION` environment variable
- Can be installed via Homebrew: `brew install nodenv`
- Uses `node-build` plugin for installing Node versions
- Automatically reads `.node-version` files in project directories
- Follows rbenv's lightweight design principles:
Minimal shell integration
Project-specific version files
Simple and predictable behavior

### nvm Setup (Legacy)

nvm is an older solution with some drawbacks:

- Heavy shell integration that can slow down shell startup
- More complex configuration and maintenance
- Not recommended for new projects
- If you must use it (e.g., legacy projects):
Use Node ≥15 which has native ARM support
For projects requiring Node ≤14, strongly consider upgrading to a newer Node version with ARM support
Avoid Homebrew installation of nvm - use the official install script

## Multi-Runtime Managers (asdf, mise)

Modern multi-runtime version managers offer unified solutions, with different approaches to version management:

### asdf

- Uses plugins for each runtime (Ruby, Node.js, etc.)
- Ruby plugin wraps ruby-build (same configuration applies)
- Node.js plugin handles architecture switching automatically
- Supports `.tool-versions` for project-specific versions

### mise (formerly rtx)

- Built-in support for Ruby and Node.js
- Automatic architecture switching for older Node versions
- Supports multiple version file formats (`.tool-versions`, `.ruby-version`, `.nvmrc`)
- Manages its own copies of build tools
- Uses a different approach for version overrides:
Uses `mise use ruby@version` for temporary switches
Supports `mise set ruby@version` for persistent changes
Environment overrides through `MISE_*` variables work differently than rbenv/nodenv

## Environment Variables and Shell Setup

Proper shell configuration is essential:

### Common Environment Variables

```
# For Ruby builds
export RUBY_CFLAGS="-Wno-error=implicit-function-declaration"
export LDFLAGS="-L$(brew --prefix readline)/lib"
export CPPFLAGS="-I$(brew --prefix readline)/include"

# For older Ruby versions
export optflags="-Wno-error=implicit-function-declaration"
export LDFLAGS="-L$(brew --prefix libffi)/lib"
export CPPFLAGS="-I$(brew --prefix libffi)/include"
```

### Shell Initialization

- rbenv: Add `eval "$(rbenv init - zsh)"` to `.zshrc`
- RVM: Include `source ~/.rvm/scripts/rvm`
- nvm: Add NVM directory and source script
- asdf: Add shims to PATH and enable completions
- mise: Ensure `~/.local/bin` is in PATH

## Best Practices and Tips

- Use native ARM builds: Always prefer native ARM versions of software. Avoid using Rosetta 2 or architecture switching commands.
- Keep tools updated: Regularly update version managers and their plugins/definitions to get the latest ARM support.
- Document configuration: Maintain team documentation about required environment setup.
- Version pinning: Use version files (`.ruby-version`, `.nvmrc`, `.tool-versions`) in projects.
- CI/CD consideration: Ensure CI/CD pipelines use ARM runners when deploying to ARM environments.
- Upgrade legacy projects: If working with older projects, prioritize upgrading to versions with native ARM support and keep emulation as a fallback only.

## Conclusion

Successfully managing Ruby and Node.js versions on macOS requires embracing native ARM support and avoiding emulation layers. By using modern versions with ARM support and following these guidelines, developers can maintain a fast, efficient development environment on Apple Silicon Macs.

### References

- ruby-build Wiki (https://github.com/rbenv/ruby-build/wiki)
- RVM on macOS Guide (https://rvm.io/integration/osx)
- NVM Installation Guide (https://github.com/nvm-sh/nvm#installing-and-updating)
- asdf Getting Started Guide (https://asdf-vm.com/guide/getting-started.html)
- mise Tips and Tricks (https://mise.jdx.dev/tips-and-tricks.html)
