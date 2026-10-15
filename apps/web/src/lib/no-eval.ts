// Zod compiles fast parsers with `new Function` unless told not to. Our CSP
// forbids eval, so the attempt fails (harmlessly) and the browser files a
// violation report on every page load. Imported first in main.tsx, because
// zod makes the attempt as each schema is built.
import { z } from "zod";

z.config({ jitless: true });
