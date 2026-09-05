# LT-1 LEARNING LOOP — PASS

LT-0 passed before LT-1 implementation. Its 10 browser cases also passed after the learning changes (`lt0-browser-2026-09-05T13-06-39-018Z.json`).

Final learning/browser run: `lt1-browser-2026-09-05T13-17-32-402Z.json`, Chrome 152.0.7977.77, five scenarios PASS, zero FAIL and zero uncaught page errors. Script: `scripts/rc-learning-browser.mjs`. The 390×844 and 430×932 runs use touch-enabled mobile contexts and actual touch taps for search entry, learning status and practice/review returns; desktop is 1280×900. Maximum-font runs use the product's 1.28 setting and rotate to 844×390 / 932×430.

The user explicitly accepted browser input plus keyboard-occupied viewport simulation. A 400px-high viewport simulates the keyboard taking space; text input, visible editor and retained draft are tested. No physical phone, native keyboard, IME-specific behavior, iOS Safari or Android device is claimed.

| Requirement | Evidence |
|---|---|
| Search opens detail, clears overlay, full tree/section/ancestor path | All three learning runs; learning-loop.test.ts F10 |
| Active filters visible; hidden children vs no children | All three runs with 100 children |
| New child visible; contiguous effective order | All three runs; actual last-child move to order 98 and add to order 100; invariant/tree suites |
| Node → note → state → linked practice → evidence → node → review → node | All three complete learning runs; persisted IDs/status/notes/review assertions and reload |
| Historical facts vs current diagnostics | Immutable event title/priority; explicit current diagnostics; F12 preserves facts across 42 status changes, rename, reset and deletion |
| Stable first completion; incomplete history unknown | Durable firstDoneAt and provenance; partial legacy totals display unknown; F12 tests |
| 20-level directory, large font and long titles | 20 levels, 100 children, 175-character mixed Chinese/unbroken-English title; bounded indentation; horizontal overflow checks |
| Viewport-aware structure menus | Head and last-child menus measured and operated, collision handling and Escape focus restoration |
| Modal close, Escape, containment and restoration | Template, outline, switcher, rename, delete dialogs; cancellation preserves data; landscape close action visible |

Screenshots under `screenshots/`: lt1-390-learning-detail.png, lt1-430-learning-detail.png, lt1-1280-learning-detail.png, both mobile structure screenshots, both keyboard-simulated screenshots, both font-xl screenshots and both landscape-dialog screenshots. Representative detail, maximum-font, keyboard, structure and landscape screenshots were visually inspected. Final screenshots are captured after startup transitions complete.

Earlier failures remain: a development dependency-cache import error; unbroken search titles and long related-practice labels causing viewport overflow; footer reappearance on input blur obstructing a return tap; a test using 重命名 where the button is labelled 改名. Defects were fixed, the selector corrected, and the complete final run passed. No partial earlier run counts as acceptance.

Product tests: 56 PASS / 0 FAIL / 0 SKIP. Applicable platform: 236 PASS / 0 FAIL, four unavailable generated-document checks explicitly skipped. Typecheck/lint exit 0; lint has 13 Fast Refresh advisories. See PLATFORM_TEST_SCOPE.md.
