// Regenerates .expo/types/router.d.ts from app/ (normally done by `expo start`), so typecheck —
// locally and in CI, where .expo/ doesn't exist — always checks links against the real routes.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
process.env.EXPO_ROUTER_APP_ROOT = path.join(root, 'app');
const generator = require(
  require.resolve('@expo/router-server/build/typed-routes', {
    paths: [require.resolve('@expo/cli', { paths: [root] })],
  }),
);
const typesDir = path.join(root, '.expo', 'types');
fs.mkdirSync(typesDir, { recursive: true });
generator.regenerateDeclarations(typesDir, {});
