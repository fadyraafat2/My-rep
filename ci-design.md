# CI Pipeline Design

## 1. Pipeline Stages

### Lint
- Ensures code style and syntax correctness.

### Build
- Builds Docker image to ensure containerization works.

### Test
- Runs test suite to prevent regressions.

## 2. Trigger Events
- On every Pull Request.
- On push to main branch.

## 3. Quality Gate
A PR is blocked if:
- Lint fails
- Docker build fails
- Any test fails

## 4. Performance Strategy (<10 min)
- Use npm ci for faster installs
- Keep dependencies minimal
- Single Docker build step
