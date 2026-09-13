/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard", "stylelint-config-recess-order"],
  ignoreFiles: ["node_modules/**", ".next/**", "out/**", "build/**", "**/*.js", "**/*.mjs", "**/*.ts", "**/*.tsx"],
  rules: {
    /* The !important ban is absolute except inside the reduced-motion
       safety block, where overrides must beat inline styles — that block
       carries a scoped stylelint-disable with a justification. */
    "declaration-no-important": true,

    /* Design-token integrity: component rules may not introduce literal
       colors. The token palette sections (and the print sheet, which must
       be palette-independent) carry scoped disables with justification. */
    "color-no-hex": true,
    /* Bare-string imports are load-bearing: @tailwindcss/postcss only inlines
       `@import "tailwindcss"`, not the url() form. */
    'import-notation': 'string',
    "color-no-invalid-hex": true,

    /* Consistent custom-property casing (--type-*, --surface-muted, …). */
    "custom-property-pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",

    /* Tailwind v4 directive at-rules. */
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "theme",
          "source",
          "utility",
          "variant",
          "custom-variant",
          "apply",
          "reference",
          "plugin",
          "tailwind",
        ],
      },
    ],

    "no-empty-source": null,
    /* Component-layer CSS intentionally orders state selectors by intent
       (base → hover → focus → disabled), not by ascending specificity. */
    "no-descending-specificity": null,
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    "comment-empty-line-before": null,
    "custom-property-empty-line-before": null,
    "declaration-empty-line-before": null,
    "at-rule-no-deprecated": null,
    "property-no-vendor-prefix": null,
  },
  overrides: [
    {
      /* Tailwind's own generated utilities are out of scope for this repo. */
      files: ["**/*.css"],
    },
  ],
};

export default config;
