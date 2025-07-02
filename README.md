# Check Changes

[![Test](https://github.com/taroj1205/check-changes/actions/workflows/test.yml/badge.svg)](https://github.com/taroj1205/check-changes/actions/workflows/test.yml)

A fast and lightweight GitHub Action for detecting file changes with include/exclude glob patterns. This action provides much faster execution compared to other file change detection actions by using optimized bash scripts and minimal dependencies.

## ⚡ Performance

- **Ultra-fast execution**: Native bash implementation with no Node.js startup overhead
- **Minimal resource usage**: No dependencies, small memory footprint
- **Optimized git operations**: Efficient file change detection using git diff

## 🚀 Features

- ✅ **Include/Exclude patterns**: Support for glob patterns with `**` recursive matching
- ✅ **Multiple output formats**: Shell-escaped, JSON array, or no file listing
- ✅ **Flexible base comparison**: Compare against any branch, commit, or automatic detection
- ✅ **Working directory detection**: Detects both committed and uncommitted changes
- ✅ **Pull request support**: Automatic base branch detection for PRs
- ✅ **Comma/newline separated patterns**: Flexible pattern specification

## 📖 Usage

### Basic Example

```yaml
name: Build on Changes
on: [push, pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      src-changed: ${{ steps.changes.outputs.changed }}
    steps:
      - uses: actions/checkout@v4
      - uses: taroj1205/check-changes@v1
        id: changes
        with:
          include: "src/**/*"
          exclude: "**/*.md"
```

### Matrix Build Example

```yaml
name: Conditional Matrix Build
on: [push, pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - name: Check frontend changes
        id: frontend
        uses: taroj1205/check-changes@v1
        with:
          include: |
            frontend/**/*
            packages/ui/**/*
          exclude: |
            **/*.test.js
            **/*.spec.js

      - name: Check backend changes
        id: backend
        uses: taroj1205/check-changes@v1
        with:
          include: "backend/**/*,api/**/*"
          exclude: "**/*.md"

  build:
    needs: changes
    strategy:
      matrix:
        component:
          - ${{ needs.changes.outputs.frontend == 'true' && 'frontend' || '' }}
          - ${{ needs.changes.outputs.backend == 'true' && 'backend' || '' }}
        exclude:
          - component: ""
    runs-on: ubuntu-latest
    steps:
      - name: Build ${{ matrix.component }}
        run: echo "Building ${{ matrix.component }}"
```

### File List Processing

```yaml
- name: Check changed files
  id: changes
  uses: taroj1205/check-changes@v1
  with:
    include: "**/*.js,**/*.ts"
    list-files: shell

- name: Lint changed files
  if: steps.changes.outputs.changed == 'true'
  run: |
    echo "Linting files: ${{ steps.changes.outputs.changed_files }}"
    eslint ${{ steps.changes.outputs.changed_files }}
```

## 📋 Inputs

| Input        | Description                                                     | Required | Default               |
| ------------ | --------------------------------------------------------------- | -------- | --------------------- |
| `include`    | Glob patterns for files to include (newline or comma separated) | No       | `**/*`                |
| `exclude`    | Glob patterns for files to exclude (newline or comma separated) | No       | `""`                  |
| `base`       | Base branch or commit to compare against                        | No       | Auto-detected         |
| `token`      | GitHub token for API access                                     | No       | `${{ github.token }}` |
| `list-files` | Output format for changed files (`none`, `shell`, `json`)       | No       | `none`                |

### Pattern Examples

```yaml
# Include all JavaScript and TypeScript files
include: |
  **/*.js
  **/*.ts
  **/*.jsx
  **/*.tsx

# Exclude test files and documentation
exclude: |
  **/*.test.*
  **/*.spec.*
  **/test/**/*
  **/*.md
  docs/**/*

# Comma-separated patterns
include: 'src/**/*,lib/**/*,packages/*/src/**/*'
exclude: '**/*.test.js,**/*.spec.js,**/*.md'
```

## 📤 Outputs

| Output          | Description                                            | Example           |
| --------------- | ------------------------------------------------------ | ----------------- |
| `changed`       | Boolean indicating if any files were changed           | `true` or `false` |
| `changed_files` | List of changed files (format depends on `list-files`) | See below         |
| `changes_count` | Number of changed files matching patterns              | `3`               |

### File List Formats

#### `list-files: shell`

```bash
# Output: space-delimited, shell-escaped
src/index.js src/utils.js docs/readme.md
```

#### `list-files: json`

```json
["src/index.js", "src/utils.js", "docs/readme.md"]
```

#### `list-files: none`

```
# No file list output, only boolean and count
```

## 🔄 Comparison Behavior

### Pull Requests

Automatically compares against the base branch:

```yaml
# Compares feature branch against main/master
on:
  pull_request:
    branches: [main, master]
```

### Push Events

Compares against the previous commit:

```yaml
# Compares current commit against HEAD~1
on:
  push:
    branches: [main, develop]
```

### Custom Base

```yaml
- uses: taroj1205/check-changes@v1
  with:
    base: "origin/main" # Compare against specific branch
    include: "src/**/*"
```

### Working Directory Changes

Detects uncommitted changes in working directory:

```yaml
# Useful for detecting changes made by previous steps
- name: Run code formatter
  run: prettier --write .

- name: Check if files were formatted
  uses: taroj1205/check-changes@v1
  with:
    base: HEAD # Compare working directory against last commit
```

## 🧪 Testing

This action includes comprehensive tests using Bun:

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Watch mode for development
bun test --watch
```

## 🛠️ Development

### Local Testing

```bash
# Clone the repository
git clone https://github.com/taroj1205/check-changes.git
cd check-changes

# Install dependencies
bun install

# Run tests
bun test

# Test the script manually
INPUT_INCLUDE="src/**/*" \
INPUT_EXCLUDE="**/*.test.js" \
INPUT_LIST_FILES="json" \
GITHUB_OUTPUT="output.txt" \
./check-changes.sh
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `bun test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

- 🐛 [Report a bug](https://github.com/taroj1205/check-changes/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/taroj1205/check-changes/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/taroj1205/check-changes/discussions)
