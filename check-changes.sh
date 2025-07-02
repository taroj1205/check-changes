#!/bin/bash
set -e

# Function to output to GitHub Actions
output() {
    local name="$1"
    local value="$2"
    echo "$name=$value" >> "$GITHUB_OUTPUT"
}

# Function to check if a file matches a glob pattern
matches_glob() {
    local file="$1"
    local pattern="$2"
    
    # Handle different pattern types
    case "$pattern" in
        "**/*"|"**")
            # Match everything
            return 0
            ;;
        "*")
            # Match everything
            return 0
            ;;
        *"**/"*)
            # Pattern like src/**/* - extract prefix and suffix
            local prefix="${pattern%%\*\**}"
            local suffix="${pattern##*\*\*}"
            suffix="${suffix#/}"
            
            # Check if file starts with prefix
            if [[ "$file" == "$prefix"* ]]; then
                # If no suffix or file matches suffix pattern
                if [[ -z "$suffix" || "$suffix" == "*" ]]; then
                    return 0
                else
                    # Check if the remaining part matches the suffix pattern
                    local remaining="${file#$prefix}"
                    case "$remaining" in
                        $suffix) return 0 ;;
                        *) return 1 ;;
                    esac
                fi
            else
                return 1
            fi
            ;;
        *)
            # Regular glob pattern
            case "$file" in
                $pattern) return 0 ;;
                *) return 1 ;;
            esac
            ;;
    esac
}

# Function to check if a file matches include patterns and doesn't match exclude patterns
matches_patterns() {
    local file="$1"
    local include_patterns="$2"
    local exclude_patterns="$3"
    
    # Check exclude patterns first (more efficient to exclude early)
    if [[ -n "$exclude_patterns" ]]; then
        while IFS= read -r pattern; do
            [[ -z "$pattern" ]] && continue
            # Remove leading/trailing whitespace
            pattern=$(echo "$pattern" | xargs)
            if matches_glob "$file" "$pattern"; then
                return 1  # File is excluded
            fi
        done <<< "$exclude_patterns"
    fi
    
    # Check include patterns
    if [[ -n "$include_patterns" ]]; then
        while IFS= read -r pattern; do
            [[ -z "$pattern" ]] && continue
            # Remove leading/trailing whitespace  
            pattern=$(echo "$pattern" | xargs)
            if matches_glob "$file" "$pattern"; then
                return 0  # File is included
            fi
        done <<< "$include_patterns"
        return 1  # File doesn't match any include pattern
    fi
    
    return 0  # No include patterns means include all (except excluded)
}

# Parse inputs
include_patterns="${INPUT_INCLUDE:-**/*}"
exclude_patterns="${INPUT_EXCLUDE:-}"
base_ref="${INPUT_BASE:-}"
list_files="${INPUT_LIST_FILES:-none}"

# Convert comma-separated to newline-separated
include_patterns=$(echo "$include_patterns" | tr ',' '\n')
exclude_patterns=$(echo "$exclude_patterns" | tr ',' '\n')

# Determine base commit for comparison
if [[ -z "$base_ref" ]]; then
    if [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
        base_ref="origin/$GITHUB_BASE_REF"
    else
        # For push events, compare against previous commit
        base_ref="HEAD~1"
    fi
fi

# Fetch the base ref if it's a remote branch
if [[ "$base_ref" == origin/* ]]; then
    git fetch origin "${base_ref#origin/}" --depth=1 2>/dev/null || true
fi

# Get changed files efficiently
echo "Comparing against: $base_ref" >&2

# Use git diff to get changed files (added, modified, deleted)
# Check both committed changes and working directory changes
if ! committed_files=$(git diff --name-only "$base_ref" HEAD 2>/dev/null); then
    # Fallback for cases where base_ref doesn't exist
    echo "Warning: Could not compare with $base_ref, using HEAD as base" >&2
    committed_files=""
fi

# Also check working directory changes (staged and unstaged)
working_files=$(git diff --name-only HEAD 2>/dev/null || true)
staged_files=$(git diff --name-only --cached 2>/dev/null || true)

# Combine all changed files and remove duplicates
changed_files=$(printf "%s\n%s\n%s\n" "$committed_files" "$working_files" "$staged_files" | sort -u | grep -v '^$' || true)



# Arrays to store results
matching_files=()
changed_count=0

# Process each changed file
while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    
    if matches_patterns "$file" "$include_patterns" "$exclude_patterns"; then
        matching_files+=("$file")
        changed_count=$((changed_count + 1))
    fi
done <<< "$changed_files"

# Set outputs
if [[ $changed_count -gt 0 ]]; then
    output "changed" "true"
else
    output "changed" "false"
fi

output "changes_count" "$changed_count"

# Format file list based on requested format
case "$list_files" in
    "shell")
        # Shell-escaped space-delimited format
        if [[ ${#matching_files[@]} -gt 0 ]]; then
            files_output=""
            for file in "${matching_files[@]}"; do
                # Escape special characters for shell
                escaped_file=$(printf '%q' "$file")
                files_output="$files_output $escaped_file"
            done
            output "changed_files" "${files_output# }"  # Remove leading space
        else
            output "changed_files" ""
        fi
        ;;
    "json")
        # JSON array format
        if [[ ${#matching_files[@]} -gt 0 ]]; then
            json_array="["
            for i in "${!matching_files[@]}"; do
                if [[ $i -gt 0 ]]; then
                    json_array="$json_array,"
                fi
                # Escape quotes and backslashes for JSON
                escaped_file=$(echo "${matching_files[$i]}" | sed 's/\\/\\\\/g; s/"/\\"/g')
                json_array="$json_array\"$escaped_file\""
            done
            json_array="$json_array]"
            output "changed_files" "$json_array"
        else
            output "changed_files" "[]"
        fi
        ;;
    "none"|*)
        # No file list output
        output "changed_files" ""
        ;;
esac

echo "Found $changed_count matching changed files" >&2

# Write GitHub Actions job summary if requested
if [[ "$(printf '%s' "$INPUT_SUMMARY" | tr '[:upper:]' '[:lower:]')" == "true" ]]; then
  {
    echo "### 🔍 Change Detection Summary"
    echo ""
    echo "| Key | Value |"
    echo "|-----|-------|"
    echo "| **Changed** | $([[ $changed_count -gt 0 ]] && echo 'Yes' || echo 'No') |"
    echo "| **Changed Files Count** | $changed_count |"
    if [[ $changed_count -gt 0 ]]; then
      echo ""
      if [[ $changed_count -gt 10 ]]; then
        echo "<details><summary>Changed Files ($changed_count)</summary>"
        echo ""
      else
        echo "**Changed Files:**"
      fi
      for file in "${matching_files[@]}"; do
        echo "- \`$file\`"
      done
      if [[ $changed_count -gt 10 ]]; then
        echo "</details>"
      fi
    fi
    echo "\n---"
  } >> "$GITHUB_STEP_SUMMARY"
fi 