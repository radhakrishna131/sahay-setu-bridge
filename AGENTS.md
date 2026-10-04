<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SAHAY-SETU architecture
- All app data references `profiles.id` (not auth user id); RLS resolves the caller via `public.my_profile_id()` — lets sample profiles exist without auth accounts.
- Data access is client-side via the browser client + TanStack Query, protected by RLS — keeps logic simple; add server functions only for privileged work.
- Notifications are created by database triggers (applications, rentals, messages) — one source of truth, no client-side fan-out.
- Signed-in pages live under `src/routes/_authenticated/` — managed auth gate.
