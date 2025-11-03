# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 27/10/2025


### Bug Fixes

- (**app**) Search select default value ([`3548db8`](https://github.com/betagouv/api-engagement/commit/3548db835ce8a56064f210fd9f00e7658311e13a))

- (**api**) Add dual write support to reassign-stats service (#488) ([`e922a26`](https://github.com/betagouv/api-engagement/commit/e922a268cfd981d6d1adc95f6df6d3c3d1346992))

- (**app**) Public stats departements graph (#487) ([`4e258a9`](https://github.com/betagouv/api-engagement/commit/4e258a9597ddde746e7e6f46619ddc18308d385c))

- (**app**) Optimize real-time activity feed (#486) ([`41a33d1`](https://github.com/betagouv/api-engagement/commit/41a33d1b45effe33e3b8e954710acf922092112f))


### Features

- (**api**) Add Service Civique support for L'Etudiant (#491) ([`cc6c6f5`](https://github.com/betagouv/api-engagement/commit/cc6c6f59e7999b7037b2402435800ee4aa4536a5))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`334a8d2`](https://github.com/betagouv/api-engagement/commit/334a8d231413c70435afccc1bb3a1c4cd358ac45))

- (**ci**) Activate READ_STATS_FROM pg for both prod and staging ([`af3a2de`](https://github.com/betagouv/api-engagement/commit/af3a2de75eeff0153add5beb47a9143e47bc2ef0))

- (**app**) Add \"iframe\" in embed iframe title ([`2d6c785`](https://github.com/betagouv/api-engagement/commit/2d6c78530245734588d51c4fe8923f1d029143bd))

-  Merge changelog from main ([`9537801`](https://github.com/betagouv/api-engagement/commit/9537801587bb6fe1cb61d531be05d90294dc2372))


### Refactoring

- (**app**) Update to React 19.2.0 (#484) ([`7854892`](https://github.com/betagouv/api-engagement/commit/78548927c41057bb4a287c305f9caf06a67e0050))

- (**app**) Use metabase embed in stats-admin admin screen (#490) ([`7c277fb`](https://github.com/betagouv/api-engagement/commit/7c277fb9cea86541cb35e142c61ac953e73b289e))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 20/10/2025


### Bug Fixes

- (**widget**) Add aria-hidden property to icons ([`c68bf39`](https://github.com/betagouv/api-engagement/commit/c68bf394920430d293f8bd1d9360b91f2c331b41))

- (**jobs**) Try to correctly catch the job error for scalway serverless jobs (#485) ([`0aa8028`](https://github.com/betagouv/api-engagement/commit/0aa8028495dc2ce83addc8e80ab5e5e28980e366))

- (**jobs**) Export organizations infinit loop (#482) ([`927906c`](https://github.com/betagouv/api-engagement/commit/927906ceb38b27fa1a45f03ed5dbf985b09f01ff))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`24ccede`](https://github.com/betagouv/api-engagement/commit/24ccedef6a8441a139f16946f77868bf062ffba1))

- (**jobs**) Optimize StatsGlobalMissionActivity MV and refresh views job (#483) ([`011ab0a`](https://github.com/betagouv/api-engagement/commit/011ab0aef8845a67908183341a087e2b0897602a))

- (**ci**) Handle Prisma migration failures (#481) ([`7fd524c`](https://github.com/betagouv/api-engagement/commit/7fd524c4b9441c52bf0b1552f6d640f4275a4c7e))

-  Merge changelog from main ([`c634d3d`](https://github.com/betagouv/api-engagement/commit/c634d3dc019dcaffaec51c56a628c4c8926cec10))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 13/10/2025


### Bug Fixes

- (**jobs**) Fix click metabase sync ([`50b4dd5`](https://github.com/betagouv/api-engagement/commit/50b4dd5378e1dd49922bb7f4f1b71a42045f0d17))

- (**api**) Add missing stat-event migrations ([`e985da2`](https://github.com/betagouv/api-engagement/commit/e985da2d146eaf2b5cafb6e85c0f403955c90fdc))

- (**ci**) Cz config ([`4e956f1`](https://github.com/betagouv/api-engagement/commit/4e956f1ed320744c6da786767d39e2cf24638219))

- (**ci**) Update PR title lint ([`3de3431`](https://github.com/betagouv/api-engagement/commit/3de3431f6be951c536db57786fddcba5dc6e3e8d))


### Features

- (**app**) Support apply custom attributes in SDK tracking (#480) ([`ceab577`](https://github.com/betagouv/api-engagement/commit/ceab577b182629ae7b6ef80beeed10f8bfc6d70a))

- (**api**) Migrate activity controller to stat-event repo (#479) ([`6014fcd`](https://github.com/betagouv/api-engagement/commit/6014fcdbac25764c77a87ae4935b868e0accd735))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`524c523`](https://github.com/betagouv/api-engagement/commit/524c5238074df4c3a3bcf57e95a61a5d1730d82a))

- (**ci**) Reactivate WRITE_STATS_DUAL for production ([`7c39a65`](https://github.com/betagouv/api-engagement/commit/7c39a6586c5e6215a7d81ed266adfa7216101c1f))

- (**ci**) Disable DUAL_STATS in production ([`494570e`](https://github.com/betagouv/api-engagement/commit/494570ecb029b8d17b7af7436b7a71e4f172cd00))

- (**ci**) Set feature flag as env variables ([`4647e14`](https://github.com/betagouv/api-engagement/commit/4647e14c0f5cd29e93e8c27a758b3074d9781e2c))

- (**ci**) Activate \"WRITE_STATS_DUAL\" for production ([`abeafb6`](https://github.com/betagouv/api-engagement/commit/abeafb6992310ea89c5a2365cdf9f5444fa04458))

-  Merge changelog from main ([`7e63b23`](https://github.com/betagouv/api-engagement/commit/7e63b2324d683aebb53fd9750c2d78e8e19edb35))

- (**ci**) Set WRITE_STATS_DUAL to true for staging env ([`2bd4c10`](https://github.com/betagouv/api-engagement/commit/2bd4c1076e007b1f6f162dd85b561654e5e3ef69))

- (**ci**) Add commitizen and PR title validation rules (#466) ([`8a5a167`](https://github.com/betagouv/api-engagement/commit/8a5a1671b9ed6b5207c134b575c4b91b56dbaad5))


### Refactoring

- (**api**) Migrate redirect controller to stat-event repository (#478) ([`fb5b2d4`](https://github.com/betagouv/api-engagement/commit/fb5b2d4d8b14693ad273dc4fc748d04b8110773a))


### Testing

- (**api**) Add redirect integration tests (#476) ([`4bed4ab`](https://github.com/betagouv/api-engagement/commit/4bed4ab4adce214663fe215f9e5494b6ff256f00))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 06/10/2025


### Bug Fixes

-  App Dockerfile ([`653f072`](https://github.com/betagouv/api-engagement/commit/653f072f4333031bb5ee45480b239de2a3470199))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`c2f69ab`](https://github.com/betagouv/api-engagement/commit/c2f69ab5de12c220219d2085199b75e66474ab09))

-  Merge changelog from main ([`4595f2e`](https://github.com/betagouv/api-engagement/commit/4595f2efebecbb2450d56ebaa47eece775533277))


### Refactoring

-  Migrate "export-stats-to-pg" job to stat-event (#463) ([`d60d14f`](https://github.com/betagouv/api-engagement/commit/d60d14f993dbfb9eb7cfd89d8a6bbeec0fb19963))

-  Migrate warnings bot job to stat event repository (#465) ([`92f260f`](https://github.com/betagouv/api-engagement/commit/92f260fae6421036e9a94d9cfe02f728cbce9be3))

-  Use stat event repo in linkedin stats job (#464) ([`f36c542`](https://github.com/betagouv/api-engagement/commit/f36c542ff612da20008ed85b24860a70c5082c0d))

-  Migrate stats/search to repository (#459) ([`e507bea`](https://github.com/betagouv/api-engagement/commit/e507beaba6a75d6c4fe8cb95339738fe398c6b6f))

-  Migrate stats-public endpoints to stat-event repository using PG views (#453) ([`fbc0bba`](https://github.com/betagouv/api-engagement/commit/fbc0bba59c6c6a862aca17ee5b5f154bd1fd52c8))

-  Use stat-event repository in kpi job (#449) ([`b58ac45`](https://github.com/betagouv/api-engagement/commit/b58ac45f3a41d9344c933c731d2b0b85aba4cc9d))

-  Migrate report job to PG and add dry-run option (#446) ([`9cbdb1b`](https://github.com/betagouv/api-engagement/commit/9cbdb1b895ce7c577ed7eba460861315d2aeacb4))

-  Use stat-event repo for mymission endpoint (#448) ([`59c506e`](https://github.com/betagouv/api-engagement/commit/59c506e76c07b6f09a3be98f6450af635bd7fc8f))


### Refacto

-  Migrate warning-bot endpoint using stat-event (#461) ([`58bbd77`](https://github.com/betagouv/api-engagement/commit/58bbd7778ad5ec0e79df36acd39546cfd5742e7c))

-  Migrate stats-admin to pg materialized view (#460) ([`86d2158`](https://github.com/betagouv/api-engagement/commit/86d2158e3d36cc534f4517092deb564cc74e19a7))

-  Migrate v0/view endpoint to stat-event repository (#450) ([`552b035`](https://github.com/betagouv/api-engagement/commit/552b035909ce75e068ba5f66fe26f90b77742767))

-  Migrate v0/mission to stat-event repository (#451) ([`cbbeafc`](https://github.com/betagouv/api-engagement/commit/cbbeafc16d55267fcf4543e8ca5ddf5385dabc15))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 29/09/2025


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`1fe406b`](https://github.com/betagouv/api-engagement/commit/1fe406ba6f4a5bb38ea0ee204b713e8db1f62f8c))

-  Merge changelog from main ([`faa6707`](https://github.com/betagouv/api-engagement/commit/faa67070fbcb5b7559054e936f227f7795d932a3))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 22/09/2025


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`632e0ca`](https://github.com/betagouv/api-engagement/commit/632e0cafe71a41ba13b7d6f1f99e4c9c12b7da9d))

-  Merge changelog from main ([`8f9ee34`](https://github.com/betagouv/api-engagement/commit/8f9ee3447b3b4b16584279fa8adc728ff8d017ce))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 15/09/2025


### Bug Fixes

-  Fix change route label ([`ea8b3e1`](https://github.com/betagouv/api-engagement/commit/ea8b3e1cfb70c2f56a67bb63c5c970199ee9fd4d))

-  Fix test ([`2e7dc47`](https://github.com/betagouv/api-engagement/commit/2e7dc470838a273991695ca903deccfde25fe146))

-  Fix sentry xml parse and asso datasub fetching ([`7d80a05`](https://github.com/betagouv/api-engagement/commit/7d80a05a8750be0006ed5d65193e7f188f03f4dc))

-  Fix xml import and dashboard feed update ([`fd741ec`](https://github.com/betagouv/api-engagement/commit/fd741ecabde19bb5464c25917916ad321f3e5ee1))

-  Fix sentry + deploy docker ([`521f754`](https://github.com/betagouv/api-engagement/commit/521f7546310f3e79ad7bbc3545024ab1d0a6802d))

-  Fix job containers name ([`756b72f`](https://github.com/betagouv/api-engagement/commit/756b72f72f5810cf642fe61ef786de55eccc32a7))

-  Fix labels missing ([`d851f1a`](https://github.com/betagouv/api-engagement/commit/d851f1a2cda8b65f879fa15d2f5880a0745f60ae))

-  Fix label mistakes ([`27132d7`](https://github.com/betagouv/api-engagement/commit/27132d7e790b613f6f51009cb935f0cc3c7e3879))

- (**api**) Add deterministic sort for my mission list (#426) ([`7225f0f`](https://github.com/betagouv/api-engagement/commit/7225f0fbef6dab24894befa57842ad0f27c9f23c))

-  Handle zero coordinates in distance calc (#423) ([`a05bc19`](https://github.com/betagouv/api-engagement/commit/a05bc19b42d8afc70b046360a7f5f66546da1005))

-  Fix api container tag ([`426752d`](https://github.com/betagouv/api-engagement/commit/426752d70e38e537f25747c50b91894ef2986bd0))


### CI/CD

- (**deps**) Bump actions/setup-node from 3 to 5 (#414) ([`3fef845`](https://github.com/betagouv/api-engagement/commit/3fef845b5f978c2192faadbc319132cb7607bc3e))

- (**deps**) Bump actions/checkout from 4 to 5 (#402) ([`3d61faa`](https://github.com/betagouv/api-engagement/commit/3d61faaad3bf699723d054d1e5db7e42828938e7))


### Features

- (**linkedin**) Cycle test missions (#427) ([`9a11a50`](https://github.com/betagouv/api-engagement/commit/9a11a503d8c874328d6c22e7d087b094d1b8eb5e))

-  Add default mission logo ([`24723f6`](https://github.com/betagouv/api-engagement/commit/24723f6983a7697d3dc57ebe211266d363702f4f))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`f67af3b`](https://github.com/betagouv/api-engagement/commit/f67af3b89af395f07b4d0af0f357887252c28015))

-  Merge changelog from main ([`959ce29`](https://github.com/betagouv/api-engagement/commit/959ce2964ee6bd85e6dbd02681d32d62c109f423))

- (**deps-dev**) Bump globals from 15.15.0 to 16.3.0 in /widget (#417) ([`b09e504`](https://github.com/betagouv/api-engagement/commit/b09e50494f07414eb6bb64c9c6150ebf25a04619))

- (**deps**) Bump the production-dependencies group (#420) ([`1e28515`](https://github.com/betagouv/api-engagement/commit/1e285154f9f9e1a46ca0d1a7257d5da77ee7cb88))

- (**deps**) Bump @sentry/cli (#416) ([`7c4e2aa`](https://github.com/betagouv/api-engagement/commit/7c4e2aad17191ccb950b655e62b12dceb4d43ad6))

- (**deps-dev**) Bump @types/node from 22.15.30 to 24.3.0 in /widget ([`8d0fb25`](https://github.com/betagouv/api-engagement/commit/8d0fb25ada8bf04689615d59d7c221857b663f89))

- (**deps**) Bump react-router-dom and sentry-react ([`973059b`](https://github.com/betagouv/api-engagement/commit/973059bbec6441b6764a11c1b5f11ab52941961e))

- (**deps-dev**) Bump @vitejs/plugin-react from 4.7.0 to 5.0.2 in /app (#394) ([`2145c85`](https://github.com/betagouv/api-engagement/commit/2145c85594d8f1db1b5c06033f172ddae58ee154))

- (**deps**) Bump @sentry/vite-plugin from 2.22.6 to 4.2.0 in /app (#391) ([`247b52b`](https://github.com/betagouv/api-engagement/commit/247b52b289130c3dafb2e33958a7c3e406ca8372))

- (**deps-dev**) Bump @vitejs/plugin-react in /widget (#397) ([`0a00b75`](https://github.com/betagouv/api-engagement/commit/0a00b7510189c9b9db157cce023df32830a152d4))

- (**deps-dev**) Bump eslint from 8.57.1 to 9.34.0 in /api (#400) ([`fc44c30`](https://github.com/betagouv/api-engagement/commit/fc44c30d5c94042ef65953ea58350efc8d5406dc))

- (**deps**) Bump @sentry/node from 9.42.1 to 10.8.0 in /api (#401) ([`466922e`](https://github.com/betagouv/api-engagement/commit/466922ea7bf77d4f9049d4e0e61eb394a722500b))

- (**deps-dev**) Bump @types/supertest from 2.0.16 to 6.0.3 in /api (#395) ([`db61e93`](https://github.com/betagouv/api-engagement/commit/db61e9344882842bc99d10847ba58a7d6a7157eb))

- (**deps-dev**) Bump mongodb-memory-server from 9.5.0 to 10.2.0 in /api (#404) ([`22082bd`](https://github.com/betagouv/api-engagement/commit/22082bdcc6e61c4914c5c5d56c9638af4abb5ebf))

- (**deps**) Bump the production-dependencies group (#387) ([`5070a57`](https://github.com/betagouv/api-engagement/commit/5070a57a9084cb926a5e1ecd1e051f2e5b2f1ec2))

- (**deps**) Bump the production-dependencies group (#399) ([`57f921b`](https://github.com/betagouv/api-engagement/commit/57f921bbed200a680c1920053ee8015fb47aa946))

- (**deps-dev**) Bump the dev-dependencies group (#405) ([`6692105`](https://github.com/betagouv/api-engagement/commit/6692105ddf6b1f7440b7c0a29b387d66c999959c))

- (**deps**) Bump the production-dependencies group (#396) ([`b1284e7`](https://github.com/betagouv/api-engagement/commit/b1284e776b55ff6f8f25fc575845408973136549))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 08/09/2025


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`979b6ce`](https://github.com/betagouv/api-engagement/commit/979b6cebf1f3c0391762e30501c124ffd64de4d0))

-  Merge changelog from main ([`5e0358c`](https://github.com/betagouv/api-engagement/commit/5e0358c28677300306bc0ea9f239925e7c49f9a2))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 01/09/2025


### Bug Fixes

-  Fix export event ([`52850d1`](https://github.com/betagouv/api-engagement/commit/52850d10d6964f216615a0aff5f41eb15b04aaf6))

-  Fix deploy ([`0a16340`](https://github.com/betagouv/api-engagement/commit/0a16340d822dd39144b6d1cf2a0d15faa73a1fc3))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`4fd0505`](https://github.com/betagouv/api-engagement/commit/4fd05052a861cf6c43a6b010c81eb9ed35bb4c6d))


### Testing

-  Test widget ([`13d5879`](https://github.com/betagouv/api-engagement/commit/13d5879451c714c893875f35db64cb2d40db87ed))

-  Test import rna job ([`e86f242`](https://github.com/betagouv/api-engagement/commit/e86f2424ef6618ae93900372b099dbf717749283))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 25/08/2025


### Bug Fixes

-  Fix publisher selector in admin mission ([`d2be287`](https://github.com/betagouv/api-engagement/commit/d2be28735217f3f17960517d2351a0feb6431db8))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`f30275f`](https://github.com/betagouv/api-engagement/commit/f30275f07bbb17de870ae53d29a5729a09bcfc76))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 18/08/2025


### Bug Fixes

-  Fix focus tab unfocus error ([`d0746bd`](https://github.com/betagouv/api-engagement/commit/d0746bd947a5df6ff253a8bf4aa8bd4a602fcd78))

-  Fix auto focus carousel ([`949c52a`](https://github.com/betagouv/api-engagement/commit/949c52a999cf29b28f5a101ccaa1c173ea1710ef))

-  Fix test ([`00fb4b5`](https://github.com/betagouv/api-engagement/commit/00fb4b5131c0f9d1bee2149398324722677e922b))

-  Fix combobox tabindex ([`dbc0247`](https://github.com/betagouv/api-engagement/commit/dbc02478a122044854104f594cfdd5446dd443a7))

-  Fix zod ([`25c4bc4`](https://github.com/betagouv/api-engagement/commit/25c4bc456b242570b3fd300c1ff1c18415bbedea))

-  Fix widget sentry ([`f7d8516`](https://github.com/betagouv/api-engagement/commit/f7d85166b4bd684c9fb98bcca35c6bc3f1c18845))

-  Fix docker build arg sentry auth token ([`1331834`](https://github.com/betagouv/api-engagement/commit/1331834c03f9a9b0c83a43d2fcb6413dace08f13))

-  Fix widget sentry settings ([`47b7945`](https://github.com/betagouv/api-engagement/commit/47b79458dd3874d494cb5a89140f92cbaea93109))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`a5eee35`](https://github.com/betagouv/api-engagement/commit/a5eee35e83d777db6e0c3e18eac79e58e6603586))

-  Merge changelog from main ([`ad54ab6`](https://github.com/betagouv/api-engagement/commit/ad54ab6be1ffb8d3e12210a5e6b080a9a2ba1ced))

- (**deps**) Bump zod from 3.25.67 to 4.0.14 in /api (#369) ([`147e874`](https://github.com/betagouv/api-engagement/commit/147e874810deea44591ad2d9590d4d0e7f1bb378))

- (**deps**) Bump csv-parse from 5.6.0 to 6.1.0 in /api (#347) ([`23ffce9`](https://github.com/betagouv/api-engagement/commit/23ffce97d004ff61fa5d0844c6e306f09cc55501))


### Testing

-  Test secret ([`f19fb22`](https://github.com/betagouv/api-engagement/commit/f19fb22ecc29c75226bbc26e2d81369368b5d51f))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 11/08/2025


### Bug Fixes

-  Fix widgets ([`2c74179`](https://github.com/betagouv/api-engagement/commit/2c74179efe0bd40f687254cceb2b9665af97f999))


### CI/CD

- (**deps**) Bump stefanzweifel/git-auto-commit-action from 5 to 6 (#323) ([`84b0406`](https://github.com/betagouv/api-engagement/commit/84b04065d3b0a4fe5f624c3492f077f267ab15af))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`ad9e9a8`](https://github.com/betagouv/api-engagement/commit/ad9e9a86ff23642711bfc69ae2775bcab4f6aec8))

-  Merge changelog from main ([`cae08cc`](https://github.com/betagouv/api-engagement/commit/cae08cc0d2b45f5c088eaf508ef57a656e91749b))

- (**deps**) Bump multer and @types/multer in /api (#343) ([`a7d0f6a`](https://github.com/betagouv/api-engagement/commit/a7d0f6a03e093c076a6e9c57df0741e4bc33c1af))

- (**deps**) Bump dotenv from 16.5.0 to 17.2.1 in /app (#328) ([`fcf3202`](https://github.com/betagouv/api-engagement/commit/fcf32025cac58e9f7aa67e1bd1a6a55d37c4045c))

- (**deps**) Bump the production-dependencies group across 1 directory with 4 updates (#362) ([`7701ffa`](https://github.com/betagouv/api-engagement/commit/7701ffa0e78b2997c7c991b305d9cd162afd5376))

- (**deps**) Bump the production-dependencies group (#363) ([`81231c9`](https://github.com/betagouv/api-engagement/commit/81231c94f389abbf6e16accfdc4b7d597d63dfed))

- (**deps**) Bump the production-dependencies group (#365) ([`d870fb9`](https://github.com/betagouv/api-engagement/commit/d870fb9a6a25194ced9b5e96b64752f502d58d33))

- (**deps**) Bump dotenv from 16.5.0 to 17.2.1 in /api (#368) ([`9ce5595`](https://github.com/betagouv/api-engagement/commit/9ce55958de4072fbdb313f6296bd2827f484e9b9))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 04/08/2025


### Bug Fixes

-  Fix cron message label ([`318156c`](https://github.com/betagouv/api-engagement/commit/318156c58d657603f63dfe6e5cb57980f35765f1))

-  Fix message slack cron ([`85b1903`](https://github.com/betagouv/api-engagement/commit/85b19037942583a8bdf6a32a12b076a61a948204))

-  Fix mission moderation refuse ([`2f607f3`](https://github.com/betagouv/api-engagement/commit/2f607f3c4587f39404642f15bd42703a56e12345))

-  Fix plausible event registration ([`b52638a`](https://github.com/betagouv/api-engagement/commit/b52638a576e6c27c27b52c7803320de54e85a46f))

-  Fix deploy ci ([`7682765`](https://github.com/betagouv/api-engagement/commit/7682765d4b5dfbdecb297d2739048f43e4be02b5))

-  Fix linkedin test ([`c0b46ae`](https://github.com/betagouv/api-engagement/commit/c0b46ae5621d06d766d912fb0f0b61cb78581883))

-  Fix ci + widget date picker translation ([`caf4edb`](https://github.com/betagouv/api-engagement/commit/caf4edb24a6e26fac8e47281cf92bbb4f5b14667))

-  Fix linkedin test ([`4d272ea`](https://github.com/betagouv/api-engagement/commit/4d272ea0275b2f7983abbebc2059df26f4910c20))

-  Fix import config ([`c75006f`](https://github.com/betagouv/api-engagement/commit/c75006ff5bbacaccef6ff53ccaeef591eb112d2d))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`db1a829`](https://github.com/betagouv/api-engagement/commit/db1a82953bcdbb38636dc21b52870bc896de24c7))

- (**deps-dev**) Bump the dev-dependencies group across 1 directory with 2 updates (#355) ([`a40bfea`](https://github.com/betagouv/api-engagement/commit/a40bfea1d4971ba9b6265a099048d1712bd9a79d))

- (**deps**) Bump the production-dependencies group across 1 directory with 9 updates (#356) ([`9666e85`](https://github.com/betagouv/api-engagement/commit/9666e85549cf3b036a10db50bf9f3ad042b0b75a))

- (**deps**) Bump the production-dependencies group across 1 directory with 6 updates (#357) ([`135e536`](https://github.com/betagouv/api-engagement/commit/135e536d4aecd2ebe64c4237ad39a5b20a10d009))

- (**changelog**) Update CHANGELOG.md ([`7c6cc07`](https://github.com/betagouv/api-engagement/commit/7c6cc07b36f3cbd84fb05f159cf81a2bf10ae36a))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 28/07/2025


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`457ca4a`](https://github.com/betagouv/api-engagement/commit/457ca4ad1884cb0df438b121eb277f903084f218))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 21/07/2025


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`b32f854`](https://github.com/betagouv/api-engagement/commit/b32f8541590b0d39117c52f7c53015302cc15968))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 14/07/2025


### Bug Fixes

-  Fix postgres mission type miss matched ([`b15f6be`](https://github.com/betagouv/api-engagement/commit/b15f6becc9c4119417398e9636b437c2034d9850))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`cf248bd`](https://github.com/betagouv/api-engagement/commit/cf248bd870fd7b7aeb0fb96655b532f0837e1260))

-  Better logging data ([`14bdf03`](https://github.com/betagouv/api-engagement/commit/14bdf03c0e608b167e47587fe584710b72c3cf4c))

-  Merge changelog from main ([`05cc083`](https://github.com/betagouv/api-engagement/commit/05cc08313933a0515f36809bc70bd9f9ad37e22a))


### Testing

-  Test referer link ([`8678892`](https://github.com/betagouv/api-engagement/commit/86788923bd2febdcb1026e8e520543b91b45e7b1))

-  Test link referal attributes ([`ed6fe2d`](https://github.com/betagouv/api-engagement/commit/ed6fe2d2a7cd2559e39e03e24c5f184c57647ea1))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 07/07/2025


### Bug Fixes

-  Fix package missing staging ([`f6eec7c`](https://github.com/betagouv/api-engagement/commit/f6eec7cf741077dfada7b219efe457d4a679b4de))

-  Workflow permission issues ([`7e391fb`](https://github.com/betagouv/api-engagement/commit/7e391fb585b84b93a37eb32c46c7dd1f2f459cc8))

-  Fix workflow process test failure ([`b6c4e24`](https://github.com/betagouv/api-engagement/commit/b6c4e243d9b60bed8bc4bd8b0c30b5c25cca9249))

-  Fix process deploy package ([`596286f`](https://github.com/betagouv/api-engagement/commit/596286f1205f4e815885596ba9b38cbb6b276e15))

-  Fix deploy failure ([`f3eb67d`](https://github.com/betagouv/api-engagement/commit/f3eb67d2b521236b9f5fec8019c30d53743e0587))

-  Revert june changelog ([`a4856dc`](https://github.com/betagouv/api-engagement/commit/a4856dc8d3d7c8004bcaa7b9979afcbe3484cddd))

-  Git cliff action ([`99e521b`](https://github.com/betagouv/api-engagement/commit/99e521b521e3a06b4e161dd47687de3f0ea2ed7a))


### Features

-  Delete mission 300 char restriction during moderation (#293) ([`14aa093`](https://github.com/betagouv/api-engagement/commit/14aa093cae0f18b808e90cb13f00bae96b6d3d0e))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`11f4912`](https://github.com/betagouv/api-engagement/commit/11f4912dd03b12c9d67d7892403e4d773d8755ed))

-  Improve Changelog generation ([`4339e81`](https://github.com/betagouv/api-engagement/commit/4339e810ac8919c061fb6ea7400e21f8cbd95451))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.


## 04/07/2025


### Bug Fixes

-  Fix prod deployment ([`2f93424`](https://github.com/betagouv/api-engagement/commit/2f93424a778f99957ae594f4f8972d9702f7ea14))


### Features

-  Add changelog workflow ([`dc0d894`](https://github.com/betagouv/api-engagement/commit/dc0d8947dde90cdbc74f1d8ce5b9913a6e0becef))


### Miscellaneous Tasks

- (**changelog**) Update CHANGELOG.md ([`9a3b31d`](https://github.com/betagouv/api-engagement/commit/9a3b31d076c1253b66ecd39a0c518f02acaee59c))

- (**deps-dev**) Bump supertest from 6.3.4 to 7.1.1 in /api (#257) ([`abae0ed`](https://github.com/betagouv/api-engagement/commit/abae0edb65de6d945283ca2ebcbbf498bde0add4))

- (**deps**) Bump the production-dependencies group across 1 directory with 6 updates (#288) ([`bc3f7ca`](https://github.com/betagouv/api-engagement/commit/bc3f7cafb5c8f1146782b4821d6ac7eac9ca9b3e))

- (**deps**) Bump the production-dependencies group across 1 directory with 8 updates (#287) ([`b6842fc`](https://github.com/betagouv/api-engagement/commit/b6842fc1f3f95257c184d1323c5737f4ae213051))

- (**deps**) Bump the production-dependencies group across 1 directory with 5 updates (#289) ([`d0d6b1e`](https://github.com/betagouv/api-engagement/commit/d0d6b1e2bf1c9c89d095a5824ac86b146d55de30))

- (**deps**) Bump the production-dependencies group across 1 directory with 7 updates (#290) ([`e004d8f`](https://github.com/betagouv/api-engagement/commit/e004d8fd046497a759d01c615d3451065873577d))


### Test

-  Add logs to redirect to see referer header ([`711dfce`](https://github.com/betagouv/api-engagement/commit/711dfce18331f5a83d8fcf6d1304a5093bc43b64))

# API Engagement - Changelog
Vous retrouverez ici l'historique des différents déploiements effectués sur l'API Engagement.
