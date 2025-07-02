# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Features

- Initial implementation of fast file change detection GitHub Action
- Support for include/exclude glob patterns with `**` recursive matching
- Multiple output formats: shell-escaped, JSON array, or no file listing
- Automatic base branch detection for pull requests
- Working directory change detection
- Cross-platform compatibility (Ubuntu, macOS)
- Comprehensive test suite with Bun
- Performance optimizations using native bash implementation

### Documentation

- Comprehensive README with usage examples
- Marketplace-ready documentation
- Contributing guidelines
- MIT license

### Tests

- Full test coverage for all features
- Pattern matching validation
- Output format testing
- Edge case handling

### CI/CD

- Release Please integration for automated versioning
- GitHub Actions workflows for testing and releases
- Conventional commit enforcement with commitlint
- Git hooks with lefthook for code quality
