# Contributing to Check Changes

Thank you for your interest in contributing! This guide will help you get started with the development workflow and release process.

## 🔄 Development Workflow

### Prerequisites

- [Bun](https://bun.sh) (latest version)
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (for commitlint)

### Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/check-changes.git
   cd check-changes
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Install git hooks**
   ```bash
   bunx lefthook install
   ```

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**

   - Edit code, tests, or documentation
   - Follow the existing code style
   - Add tests for new functionality

3. **Test your changes**

   ```bash
   # Run tests
   bun test

   # Check formatting and linting
   bun run check

   # Test the action locally
   INPUT_INCLUDE="**/*.md" \
   INPUT_EXCLUDE="" \
   INPUT_LIST_FILES="json" \
   GITHUB_OUTPUT="output.txt" \
   ./check-changes.sh
   ```

## 📝 Commit Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```bash
# Good commits
git commit -m "feat: add support for custom base branch comparison"
git commit -m "fix: resolve pattern matching issue with nested directories"
git commit -m "docs: update README with new examples"
git commit -m "test: add coverage for edge cases in glob matching"

# Bad commits
git commit -m "Update stuff"
git commit -m "Fix bug"
git commit -m "WIP"
```

## 🚀 Release Process

This project uses **Release Please** for automated version management and releases.

### How It Works

1. **Conventional Commits**: All commits must follow conventional commit format
2. **Automatic PRs**: Release Please creates release PRs based on commit history
3. **Version Bumping**: Semantic versions are automatically calculated
4. **Changelog**: CHANGELOG.md is automatically updated
5. **GitHub Releases**: Releases are created with proper tags
6. **Major Version Tags**: Tags like `v1`, `v2` are updated automatically

### Version Bumping Rules

- `feat:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` → Patch version bump (1.0.0 → 1.0.1)
- `feat!:` or `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)

### Release Workflow

1. **Merge changes to main**

   ```bash
   git checkout main
   git pull origin main
   ```

2. **Release Please creates a PR**

   - Automatically analyzes commits since last release
   - Updates version in `package.json`
   - Updates `CHANGELOG.md`
   - Creates release PR

3. **Review and merge release PR**

   - Review the changelog and version bump
   - Merge the release PR

4. **Automatic release**
   - GitHub release is created
   - Major version tag is updated (e.g., `v1` → latest `v1.x.x`)
   - Action is available on marketplace

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
bun test

# Watch mode for development
bun test --watch

# Run specific test file
bun test test/check-changes.test.ts
```

### Manual Testing

```bash
# Test with different patterns
INPUT_INCLUDE="src/**/*" \
INPUT_EXCLUDE="**/*.test.js" \
INPUT_LIST_FILES="shell" \
GITHUB_OUTPUT="/tmp/output.txt" \
./check-changes.sh

# Check the output
cat /tmp/output.txt
```

### Integration Testing

The CI pipeline tests the action in real GitHub Actions environment:

- Tests on Ubuntu and macOS
- Tests different input combinations
- Validates outputs and exit codes

## 📊 Code Quality

### Pre-commit Hooks

The following checks run automatically before each commit:

- **Formatting**: Biome formats code
- **Linting**: Biome checks code quality
- **Tests**: All tests must pass
- **Commit message**: Must follow conventional commits

### Code Style

- Use Biome for formatting and linting
- Follow existing patterns in the codebase
- Add JSDoc comments for complex functions
- Keep functions small and focused

## 🐛 Bug Reports

Please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when reporting issues.

## 💡 Feature Requests

Please use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) when suggesting new features.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions

Feel free to open a [discussion](https://github.com/taroj1205/check-changes/discussions) if you have any questions about contributing!
