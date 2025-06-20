# 🤝 Contributing to Scraping MCP Agent

We love your input! We want to make contributing to the Scraping MCP Agent as easy and transparent as possible, whether it's:

- 🐛 Reporting a bug
- 💡 Discussing the current state of the code
- 🚀 Submitting a fix
- 📝 Proposing new features
- 🎯 Becoming a maintainer

## 📋 Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### 🔄 We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## 🚀 Quick Start for Contributors

### Prerequisites

- **Node.js 18+**
- **Git**
- **Docker** (optional, for containerized development)

### Setup Development Environment

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/scraping-mcp-agent.git
cd scraping-mcp-agent

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npm run install-browsers:quick

# 4. Set up environment
cp .env.example .env

# 5. Run tests to ensure everything works
npm test

# 6. Start development mode
npm run dev
```

### 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- scraper.test.ts

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format
```

## 📝 Pull Request Process

### 1. **Branch Naming Convention**

- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation changes
- `refactor/description` - for code refactoring
- `test/description` - for adding tests

Example: `feature/add-linkedin-scraper` or `fix/memory-leak-playwright`

### 2. **Commit Messages**

We follow [Conventional Commits](https://conventionalcommits.org/):

```bash
# Format
<type>[optional scope]: <description>

# Examples
feat: add LinkedIn profile scraper
fix(core): resolve memory leak in Playwright scraper
docs: update API documentation for rate limiting
test: add unit tests for data cleaner
refactor(agents): simplify e-commerce agent logic
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### 3. **Pull Request Template**

When creating a PR, please use this template:

```markdown
## 📋 Description

Brief description of what this PR does.

## 🎯 Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## ✅ Testing

- [ ] Tests pass locally with `npm test`
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested the changes manually

## 📸 Screenshots (if applicable)

Add screenshots to help explain your changes.

## 📚 Documentation

- [ ] I have updated the documentation accordingly
- [ ] I have updated the API reference if needed
- [ ] I have added examples if introducing new features

## ⚖️ Legal & Ethics

- [ ] My changes respect robots.txt and website terms of service
- [ ] I have considered the legal implications of my changes
- [ ] My changes follow ethical scraping practices

## 🔍 Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## 🏗️ Development Guidelines

### 📁 Project Structure

```
src/
├── core/           # Core scraping engines
├── mcp/            # MCP server and tool handlers
├── agents/         # Specialized scraping agents
├── utils/          # Utility functions and helpers
└── types/          # TypeScript type definitions
```

### 🎨 Code Style

We use **ESLint** and **Prettier** for code formatting:

```bash
# Check style
npm run lint
npm run format:check

# Fix style issues
npm run lint:fix
npm run format
```

**Key style guidelines:**
- Use TypeScript for all new code
- Follow existing naming conventions
- Write clear, descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use async/await instead of Promise chains

### 🧪 Testing Guidelines

**Write tests for:**
- All new features
- Bug fixes
- Public API changes
- Edge cases and error conditions

**Testing structure:**
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    test('should do something specific', async () => {
      // Arrange
      const input = 'test data';
      
      // Act
      const result = await component.method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### 🏷️ Adding New Scrapers

When adding support for a new website:

1. **Check legality** - Ensure scraping is allowed
2. **Add selectors** to `config/selectors.json`
3. **Create tests** with real examples
4. **Update documentation**
5. **Consider rate limiting** needs

Example:
```typescript
// src/agents/new-site-agent.ts
export class NewSiteAgent {
  async scrapeNewSite(url: string, options: NewSiteOptions): Promise<NewSiteResult> {
    // Implementation
  }
}
```

### 📚 Documentation Standards

- **README.md** - Main project documentation
- **API Reference** - Complete API documentation in `docs/api-reference.md`
- **Examples** - Working examples in `examples/`
- **Code Comments** - JSDoc for public APIs
- **Changelog** - Track all changes

## 🐛 Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-repo/scraping-mcp-agent/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### 🐛 Bug Report Template

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Node.js Version: [e.g. 18.17.0]
 - Project Version: [e.g. 1.0.0]
 - Browser: [e.g. Chrome 120] (if applicable)

**Additional Context**
Add any other context about the problem here.

**Logs**
If applicable, add relevant log output:
```
[Paste logs here]
```
```

## 💡 Feature Requests

We welcome feature requests! Please use our [feature request template](https://github.com/your-repo/scraping-mcp-agent/issues/new?template=feature_request.md).

**Great Feature Requests** include:

- **Use case** - What problem does this solve?
- **Proposed solution** - How would you like it to work?
- **Alternatives** - What alternatives have you considered?
- **Examples** - Can you provide examples or mockups?

## 🔐 Security

### Reporting Security Issues

**Please do not report security vulnerabilities publicly.** Instead, email us at security@your-domain.com.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Security Guidelines

- Never commit secrets, API keys, or passwords
- Use environment variables for sensitive configuration
- Validate all inputs
- Follow principle of least privilege
- Regular dependency updates

## 📜 Code of Conduct

### Our Pledge

We are committed to making participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to creating a positive environment include:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior include:**

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## 🏆 Recognition

Contributors who make significant contributions will be:

- Added to the CONTRIBUTORS.md file
- Mentioned in release notes
- Given contributor badge on GitHub
- Invited to join the maintainer team (for exceptional contributors)

## 📞 Getting Help

**Need help contributing?**

- 💬 Join our [Discord community](https://discord.gg/your-discord)
- 📧 Email us at contributors@your-domain.com
- 📖 Check the [documentation](docs/)
- 🐛 Search [existing issues](https://github.com/your-repo/scraping-mcp-agent/issues)

## 📚 Resources

### Learning Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

### Project Resources

- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Best Practices](docs/best-practices.md)
- [Legal Guidelines](LEGAL.md)

## 🎉 Thank You!

Thank you for contributing to the Scraping MCP Agent! Your contributions help make web scraping more accessible, reliable, and ethical for everyone.

**Happy coding!** 🚀

---

*This contributing guide is adapted from the open-source contribution guidelines and best practices.*