# Translations

Strings live in `en/` and `ar/`, one module per page or area (`cars.js`,
`booking.js`, `common.js`, ...). Each language's `index.js` imports its
modules and exports them as one object keyed by module name.
`src/contexts/LanguageContext.jsx` loads both languages, stores the choice in
`localStorage` and sets `dir="rtl"` on the document for Arabic.

Components read strings with the `t` function:

    import { useLanguage } from '../contexts/LanguageContext';

    const { t, isRTL } = useLanguage();
    t('booking.platformFee', { percent: 5 });

Keys are `module.key`, and nested objects are reached with more dots
(`rentals.paymentStatus.paid`). `{{name}}` placeholders are replaced from the
second argument. A missing key logs a warning and renders the key itself.

## Adding a key

Add the key to the module in both `en/` and `ar/`, using the same name. Put
strings used on several pages in `common.js`. Keys are camelCase.

## Adding a module

1. Create `en/<module>.js` and `ar/<module>.js`, each with
   `export default { ... }`.
2. Import the module in `en/index.js` and `ar/index.js` and add it to the
   exported object.
