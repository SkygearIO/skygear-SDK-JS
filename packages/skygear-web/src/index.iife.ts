import "core-js/features/promise";
import "whatwg-fetch";

import * as all from ".";
// eslint-disable-next-line no-duplicate-imports
import defaultContainer from ".";

const merged = defaultContainer;
for (const key of Object.keys(all)) {
  // @ts-ignore
  merged[key] = all[key];
}

export default merged;
