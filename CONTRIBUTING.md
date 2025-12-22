# Contributing to MWI Tools

Thank you for your interest in contributing to MWI Tools!

## Version Management

This project uses [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

### Version Scheme

**Pre-Release (0.x.x):**
- `0.1.0` - Initial refactored release
- `0.1.1` - Bug fixes
- `0.2.0` - New features
- `0.x.x` - All versions before 1.0.0 are considered unstable/testing

**Stable Releases (1.0.0+):**
- `MAJOR` - Breaking changes (e.g., API changes, removed features)
- `MINOR` - New features (backwards compatible)
- `PATCH` - Bug fixes and refactorings (no new features)

### When to Bump Versions

**PATCH (0.1.0 → 0.1.1):**
- Bug fixes
- Performance improvements
- Code refactoring (no behavior changes)
- Documentation updates

**MINOR (0.1.0 → 0.2.0):**
- New features
- New modules added
- New configuration options
- Backwards-compatible API additions

**MAJOR (0.9.0 → 1.0.0):**
- Stable release ready for production
- Breaking API changes
- Removed features
- Major architectural changes

### How to Update Version

When making a release, update version in **4 locations**:

1. **userscript-header.txt** (line 4):
   ```javascript
   // @version      0.1.0
   ```

2. **src/main.js** (line 54 - test code):
   ```javascript
   storage.setJSON('test_json', { name: 'MWI Tools', version: '0.1.0' });
   ```

3. **src/main.js** (line 168 - exposed API):
   ```javascript
   version: '0.1.0'
   ```

4. **package.json** (line 3):
   ```json
   "version": "0.1.0",
   ```

### Release Process

1. **Make your changes** in a feature branch
2. **Test thoroughly** using TESTING_CHECKLIST.md
3. **Update CHANGELOG.md** with your changes under `## [Unreleased]`
4. **When ready to release:**
   ```bash
   # Determine new version (0.1.1, 0.2.0, etc.)

   # Update version in all 4 locations
   # Edit: userscript-header.txt, src/main.js (2 places), package.json

   # Build
   npm run build

   # Update CHANGELOG.md
   # Move [Unreleased] changes to new version section
   # Add release date

   # Commit
   git add -A
   git commit -m "chore: Release version 0.1.1"

   # Tag
   git tag -a v0.1.1 -m "Release version 0.1.1"

   # Push (when repository is set up)
   # git push && git push --tags
   ```

## Development Workflow

1. **Create a branch** for your feature/fix
2. **Write code** following existing patterns
3. **Test** your changes thoroughly
4. **Update documentation** if needed
5. **Update CHANGELOG.md** under `## [Unreleased]`
6. **Build and test** the userscript
7. **Commit** with conventional commit messages
8. **Create pull request** (when repository is set up)

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no behavior change)
- `docs:` - Documentation updates
- `chore:` - Maintenance (version bumps, build config)
- `test:` - Adding/updating tests
- `perf:` - Performance improvements

### Examples

```bash
# New feature
git commit -m "feat: Add expected value calculator for containers"

# Bug fix
git commit -m "fix: Correct efficiency formula in action time calculation"

# Refactoring
git commit -m "refactor: Extract HTML generation into helper methods"

# Documentation
git commit -m "docs: Update README with version 0.1.0"

# Version bump
git commit -m "chore: Release version 0.1.1"
```

## Code Style

- **ES6 modules** - Use import/export
- **JSDoc comments** - Document all functions
- **Descriptive names** - Clear, self-documenting code
- **Small functions** - Single responsibility principle
- **No magic numbers** - Use named constants

## Testing

Before submitting:

1. **Run build**: `npm run build`
2. **Test in browser** with Tampermonkey
3. **Check TESTING_CHECKLIST.md** for comprehensive tests
4. **Verify no console errors**
5. **Test on both milkywayidle.com and test.milkywayidle.com**

## Questions?

Check existing documentation:
- **README.md** - Quick start and overview
- **PROJECT_DOCS.md** - Detailed project structure
- **CHANGELOG.md** - Version history
- **TESTING_CHECKLIST.md** - Testing guide

---

Thank you for contributing! 🎉
