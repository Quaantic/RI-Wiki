CONTENT DELIVERY FIX

The live site's JavaScript was updated, but its wiki/game JSON still had zero
imported sections on all seven requested pages. This package carries the actual
data inside JavaScript, and applies it to both the public wiki and older admin
drafts. It does not include or replace content/update-log.json.

DEPLOY
1. Upload/merge this package's js folder into the repository's existing js folder.
   Preserve the js/data and js/edit subfolders and include NEW files too.
2. Let the site's normal Vercel deployment finish.
3. Refresh the site once. The seven pages should now be populated immediately.
4. Save for everyone in the admin to persist the repaired shared draft.

INCLUDED DATA
life/frost-generators: three machines, upgrade prices, income/cycle formulas.
life/golden-points: six investment targets and their requirements/bonuses.
life/golden-research-milestones: seven milestones.
main/californium-milestones: sixteen milestones and related formulas.
main/astatine-power: eight milestones, Astatine powers and Californium buffs.
life/frost-conversion: all four conversions together, no child tabs.
money-island/energies: all four energies together, no child tabs.

VERIFICATION
artifacts/content-import-audit.json records the live BEFORE and simulated AFTER.
The audit and local tests do not deploy to Vercel or modify the live site.
