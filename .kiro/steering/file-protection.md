---
inclusion: always
---

# File Protection Rules

## Read-Only Files
The following files should NEVER be modified:

- All files that match patterns listed in `.gitattributes` and which are marked  as `linguist-generated`
- Any files with `.generated.` in the filename
- Files in `dist/` or `build/` directories

## Instructions
- Always check if a file is in the read-only list before making changes
- If you need to update API documentation, modify the source code comments instead
- When asked to modify protected files, explain why they shouldn't be changed and suggest alternatives
