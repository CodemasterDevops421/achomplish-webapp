# Contributing to Accomplish

## Development Workflow

1. Create feature branch from `main`
2. Make changes
3. Test locally
4. Create PR
5. Deploy to preview (Vercel auto-deploys)
6. Merge to `main` → auto-deploy to production

## Code Standards

- TypeScript strict mode
- Prettier for formatting
- ESLint for linting
- Components in `src/components`
- API routes in `src/app/api`

## Testing V1

Manual testing checklist:
- [ ] Can create entry
- [ ] Can view past entries
- [ ] Can edit/delete
- [ ] AI enhancement works
- [ ] Reminders send
- [ ] Review generator works
- [ ] Mobile responsive

## Before Pushing
```bash
npm run lint
npm run type-check
npm run build
```
