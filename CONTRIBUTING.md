# Contributing to NearHelp

Thank you for considering contributing to NearHelp! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear use case
   - Expected behavior
   - Why this feature would be useful
   - Possible implementation approach

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/nearhelp.git
   cd nearhelp
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the coding standards below
   - Write tests for new features
   - Update documentation

4. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new emergency type"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### JavaScript Style

- Use ES6+ features
- Use `const` and `let`, avoid `var`
- Use arrow functions where appropriate
- Use async/await over callbacks
- Add JSDoc comments for functions

### File Structure

```javascript
// 1. Imports
const express = require('express');

// 2. Constants
const MAX_RETRIES = 3;

// 3. Helper functions
function helperFunction() {}

// 4. Main logic
exports.mainFunction = async (req, res) => {
    // Implementation
};
```

### Error Handling

```javascript
const { AppError, asyncHandler } = require('../middleware/errorHandler.middleware');

exports.someFunction = asyncHandler(async (req, res) => {
    if (!req.body.required) {
        throw new AppError('Required field missing', 400);
    }
    // Logic
});
```

### Validation

Always validate inputs using Joi schemas:

```javascript
const schema = Joi.object({
    field: Joi.string().required()
});

const { error, value } = schema.validate(req.body);
```

## Testing Guidelines

### Unit Tests

- Test individual functions in isolation
- Mock external dependencies
- Aim for 80%+ coverage

```javascript
describe('Function Name', () => {
    it('should do something', () => {
        expect(result).toBe(expected);
    });
});
```

### Integration Tests

- Test API endpoints
- Use supertest for HTTP testing
- Test error cases

```javascript
const response = await request(app)
    .post('/api/endpoint')
    .send(data);

expect(response.status).toBe(200);
```

## Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example:
```
feat: add fire emergency type

- Added fire crisis type to schema
- Updated AI guidance for fire emergencies
- Added tests for fire emergency flow
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API documentation in route files
- Add examples for new features

## Review Process

1. Automated tests must pass
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## Questions?

Feel free to open an issue for questions or reach out to maintainers.

Thank you for contributing! 🎉
