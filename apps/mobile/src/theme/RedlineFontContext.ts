import { createContext } from 'react';

/** False also covers loading and failure: RText uses system text in either case. */
export const RedlineFontContext = createContext(false);
