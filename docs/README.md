# create-sati-agent Documentation

## Best Practices

This repository includes the [ERC-8004 Best Practices](https://github.com/erc-8004/best-practices) as a git submodule.

See [best-practices/](best-practices/) for comprehensive guides:

- **[Registration](best-practices/Registration.md)** - How to create registration files that look great across all ERC-8004 compatible explorers and marketplaces
- **[Reputation](best-practices/Reputation.md)** - Understanding feedback signals, trust models, and how to build on ERC-8004 reputation
- **[ERC-8004 Spec](best-practices/src/ERC8004SPEC.md)** - Full draft specification (reference)

### Quick Links

- **OASF Skills & Domains**: Standardized agent capability taxonomies
  - [All Skills](best-practices/src/all_skills.json)
  - [All Domains](best-practices/src/all_domains.json)
  - [Combined Reference](best-practices/src/all_skills_and_domains.json)
  - Public schema: https://schema.oasf.outshift.com/0.8.0

---

**Note**: The best-practices directory is a git submodule. To update it:

```bash
git submodule update --remote docs/best-practices
```
