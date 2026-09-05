# Leo Tree — Astra Full-Repository Review Brief

**Document:** `ASTRA_REVIEW_BRIEF.md`\
**Product:** Leo Tree\
**Review mode:** Repository-wide Product / UX / Architecture Audit\
**Current phase:** Early independent product, moving from prototype toward a stable v0.x foundation\
**Primary instruction:** AUDIT FIRST. DO NOT IMPLEMENT UNTIL EXPLICITLY AUTHORIZED.

---

# 0. Why this document exists

You are reviewing an existing product, not designing a new one from scratch.

Leo Tree already has:

- a product identity;
- a visual language;
- a working interaction model;
- a domain model;
- local persistence;
- knowledge-tree editing;
- learning-state tracking;
- practice logs and review concepts;
- a lightweight community/garden direction.

The goal of this review is therefore **not**:

> “What else can we add?”

The goal is:

> “What must be preserved, simplified, corrected, stabilized, or redesigned before Leo Tree grows further?”

Please treat restraint as a feature.

A strong recommendation to **remove, freeze, defer, or simplify** is more valuable than ten speculative features.

---

# 1. What Leo Tree is

Leo Tree is a personal knowledge-structure system.

Its core idea is not:

- note-taking;
- mind mapping;
- bookmarking;
- course hosting;
- generic document management;
- a Notion clone;
- a social network.

Its intended core loop is:

```text
Create a knowledge tree
        ↓
Divide a field into sections
        ↓
Create nodes
        ↓
Grow child nodes / branches
        ↓
Record understanding
        ↓
Change learning state
        ↓
Record practice
        ↓
Review progress
        ↓
Refine the knowledge structure
```

The product should help a person turn a field of knowledge into a structure that can be:

- decomposed;
- learned;
- revisited;
- practiced;
- corrected;
- extended over time.

# 2. Product metaphor

Leo Tree currently uses a restrained garden / tree metaphor.

User-facing concepts include:

```text
园子      = the user's collection of knowledge trees
知识树    = one complete knowledge structure
分区      = first-level organization
枝 / 枝干 = local tree path / branch context
节点      = atomic knowledge unit
```

Some actions may use lightweight metaphorical language:

```text
开园
栽树
入园
修枝
```

This metaphor is intentionally limited.

Do NOT expand it into a fantasy/gamified gardening system.

Do not recommend concepts such as:

- watering;
- fertilizer;
- sunlight;
- fruit;
- leaves as XP;
- garden level;
- growth currency;
- seasonal rewards;
- virtual land;
- farming loops.

The product remains a modern knowledge tool.

Rule:

> User-facing actions may be poetic. Data semantics must stay precise.

# 3. Internal conceptual model

The current product direction should continue to map to clear internal concepts such as:

```text
Garden / Workspace
KnowledgeTree
Section
Node
Branch / Path
Review
PracticeLog
Attachment
Template
```

Priority remains machine-readable:

```text
P0
P1
P2
P3
```

The UI may display:

```text
P0 梅
P1 兰
P2 竹
P3 菊
```

But “梅 / 兰 / 竹 / 菊” are visual aliases only.

Do not bind storage, sorting, APIs, import/export, or future AI integration to the Chinese metaphor.

Learning state currently follows:

```text
□ 未学
△ 在学
✓ 掌握
```

This semantic model should remain explicit.

# 4. Product history that matters

Leo Tree originated from an SNN calibration knowledge-tree prototype.

That history is important only because:

- the original SNN content remains useful;
- the original status / priority / review / practice concepts were valuable.

However:

> SNN is no longer the product.

SNN should exist as a template / example knowledge tree, not as a hard-coded application domain.

A first-time user who knows nothing about spiking neural networks should still understand Leo Tree immediately.

# 5. Current product areas

## My Garden

The user's own collection of knowledge trees.

Current language includes ideas such as:

> 一园可种多棵。点进去修枝，或再栽一棵。

This area should remain simple.

Primary actions should conceptually be:

```text
新建知识树
从模板开始
导入
```

SNN should appear only inside the Template layer.

## Knowledge Tree

A knowledge tree contains:

- sections;
- nodes;
- child nodes;
- arbitrary depth;
- status;
- priority;
- notes / understanding records;
- progress;
- optional attachments;
- practice-log relationships.

Tree structure matters more than visual graph rendering.

Leo Tree is not required to become a giant node-canvas mind map.

## Weekly Review

Review should help a user understand:

- what advanced;
- what is stuck;
- what should be revisited;
- what should be learned next.

It should remain connected to actual tree state rather than become a generic journaling page.

## Practice Log

Practice logs exist because knowledge should not remain purely declarative.

Possible examples include:

- solving a problem;
- conducting an experiment;
- implementing something;
- reading and checking a derivation;
- performing a research task.

The generic log system should not become hard-coded to SNN.

## Community

The current direction uses the metaphor of entering other gardens and bringing trees into one's own garden.

Existing language includes:

```text
社区
搜索园子
栽下我的
入园
```

This is intentionally lightweight.

The current product does NOT need:

- likes;
- comments;
- followers;
- ranking;
- popularity feeds;
- direct messaging;
- creator economy;
- paid templates;
- gamified engagement.

Community is currently closer to:

```text
browse → inspect → bring a useful tree into your own space
```

than to a social network.

# 6. Visual identity — preserve this

Leo Tree already has a visual identity.

Core elements:

- warm paper / 宣纸-like ground;
- restrained ink;
- cinnabar accent;
- low saturation;
- large negative space;
- botanical imagery;
- subtle research traces;
- modern typography and controls;
- East-Asian paper-and-ink atmosphere without becoming a “古风 website”.

The visual system should feel:

```text
quiet
scholarly
human
contemporary
focused
```

It should NOT become:

- glassmorphism;
- neon;
- blue-purple AI gradient;
- cyberpunk;
- heavy shadow SaaS cards;
- pill-heavy dashboard UI;
- decorative “Chinese style” kitsch.

Do not add:

- lanterns;
- dragons;
- clouds;
- scroll frames;
- excessive seals;
- brush cursors;
- calligraphy banners.

The visual system should serve the knowledge structure.

# 7. Current mobile-first reality

Leo Tree is used seriously on mobile.

A major review target is approximately:

```text
390px wide mobile viewport
430px wide mobile viewport
desktop 1280px+
```

Current mobile UI already demonstrates that the product is viable on phones, but several areas are becoming information-dense.

Please pay particular attention to:

- node detail;
- node editing;
- filters;
- attachment UI;
- bottom navigation;
- safe areas;
- long trees;
- deep hierarchy navigation;
- modal height;
- touch target sizes;
- destructive actions;
- keyboard interaction;
- scroll behavior.

Do not evaluate the product as a desktop-only tool.

# 8. Known UX concern: node detail is becoming too dense

The current node detail / editing experience may expose too many controls simultaneously.

Examples include:

- title;
- summary;
- state;
- priority;
- notes;
- attachment uploader;
- practice-log relationship;
- section selection;
- move up;
- move down;
- delete;
- child nodes;
- add child.

The desired principle is:

> Learning / reading controls should dominate.  
> Structural maintenance controls should recede.

Possible distinction:

```text
ordinary node view
vs.
structure editing mode
```

Potential structural operations that should not dominate normal reading:

- delete;
- move section;
- reorder;
- structural relocation.

Please assess whether the current implementation actually achieves this cleanly.

# 9. Known UX concern: attachments

Attachments are useful but not the product center.

Priority should remain approximately:

```text
knowledge structure
>
understanding / notes
>
learning status
>
practice
>
attachments
```

A large attachment dropzone should not dominate every list card.

Please examine:

- where attachments appear;
- whether list views expose too much attachment UI;
- whether the detail page gives them appropriate weight;
- whether file handling creates unnecessary complexity.

Do NOT recommend turning Leo Tree into a file manager.

# 10. Known UX concern: bottom navigation

The floating bottom navigation is part of the current visual identity and should likely remain.

However, it must not cover real content.

Please audit whether the app uses a systematic bottom-safe-area model rather than page-specific hacks.

The desired invariant is:

> When a scrollable page reaches its end, the last real content remains fully visible above the bottom navigation and device safe area.

# 11. Templates

Templates should be a first-class abstraction.

Current SNN knowledge content should become one template.

Future templates could theoretically include:

- mathematics;
- physics;
- fluid mechanics;
- philosophy;
- computer science;
- research workflows.

But this review should NOT invent many new template contents.

Audit the abstraction, not the template catalog.

# 12. Local-first behavior

Leo Tree currently values local persistence.

Important properties:

- user data should survive reload;
- import/export should remain reliable;
- tree identity should be stable;
- existing data should not silently disappear after schema changes;
- migrations should be explicit.

Please audit:

- persistence boundaries;
- schema versioning;
- migration paths;
- IDs;
- merge/import behavior;
- accidental overwrite risks;
- malformed JSON handling;
- data integrity.

Do not assume cloud storage is required.

# 13. Future Leo AI relationship

Leo Tree is currently independent.

Do NOT integrate Leo AI during this review.

However, future architecture should allow Leo AI to operate on domain objects without scraping the DOM.

Potential future actions might include:

```text
createKnowledgeTree
readKnowledgeTree
createSection
createNode
updateNode
linkNodes
readLearningState
createPracticeLog
readReview
recommendNextNode
```

This means:

> Business/domain operations should not exist only as UI event handlers.

Please evaluate whether data model, services, persistence, and UI are sufficiently separated for future integration.

Do not build the integration now.

# 14. Possible future tree lineage

A future community feature may allow a person to bring another person's knowledge tree into their own garden.

This could eventually behave somewhat like a fork:

```text
source tree
↓
copied / derived tree
↓
user evolves it independently
```

Possible future concepts:

```text
sourceTreeId
parentTreeId
lineage
```

Do NOT implement this unless the current architecture already supports it trivially.

Only assess whether the current model would make it unnecessarily difficult later.

# 15. Things currently considered approximately frozen

Treat the following as expensive to change unless you find a serious product or technical flaw:

- Leo Tree name;
- garden / tree metaphor at its current intensity;
- “我的 / 社区 / 设置” bottom navigation;
- knowledge tree / weekly review / practice log concept;
- P0 梅 / P1 兰 / P2 竹 / P3 菊 display;
- □ / △ / ✓ learning states;
- warm paper / ink / cinnabar visual identity;
- local-first direction;
- SNN as template rather than core domain;
- arbitrary-depth nodes;
- section → node structure;
- restrained community direction.

Do not recommend change merely because another design is also valid.

# 16. Explicit non-goals for the current phase

Do NOT recommend these as immediate work unless you identify a concrete architectural blocker that requires them:

- AI automatic tree generation;
- chat assistant inside Leo Tree;
- Leo AI integration;
- vector database;
- knowledge graph canvas;
- real-time collaboration;
- multiplayer editing;
- comments;
- likes;
- followers;
- ranking;
- social feed;
- paid marketplace;
- complex cloud sync;
- gamification;
- new framework rewrite;
- new state-management framework solely for fashion;
- new backend solely because “a real app needs one”;
- microservices;
- premature enterprise architecture.

# 17. What I want Astra to audit

Do not begin by proposing features.

First reconstruct the product.

I want an independent assessment of:

## Product model

- What is Leo Tree actually becoming?
- Is the current mental model coherent?
- Are any metaphors fighting the data structure?
- Is the product differentiated from note apps / mind maps / template systems?

## Information architecture

- Are Garden / Tree / Section / Node / Review / Practice relationships clear?
- Are any concepts duplicated?
- Are screens organized around user goals rather than implementation details?

## UX

- What causes friction?
- What is too dense?
- What is too hidden?
- What should become quieter?
- What is beautiful but impractical?

## Mobile UX

- hierarchy navigation;
- bottom navigation;
- safe areas;
- filtering;
- node editing;
- attachments;
- destructive actions;
- long content;
- keyboard behavior.

## Domain model

- IDs;
- hierarchy;
- parent/child semantics;
- sections;
- statuses;
- priorities;
- reviews;
- logs;
- templates;
- metadata.

## Persistence

- schema versioning;
- migrations;
- local storage boundaries;
- import/export;
- data corruption;
- overwrite behavior.

## Architecture

- component boundaries;
- business logic vs UI;
- persistence abstraction;
- domain services;
- over-coupling;
- future Leo AI readiness.

## Code health

- oversized files;
- duplicated state;
- hidden side effects;
- stale code;
- fragile CSS;
- dead abstractions;
- unnecessary complexity;
- missing tests.

## Accessibility

- contrast;
- font scaling;
- semantics;
- focus;
- keyboard;
- reduced motion;
- touch targets.

## Security / privacy

Only where relevant to the current local-first product.

Do not invent enterprise threat models that are irrelevant to the present stage.

# 18. The review must distinguish severity

Do not return a flat list of 50 suggestions.

Every finding should be classified.

Suggested classes:

```text
P0 — can corrupt data / break core product meaning / create severe architectural lock-in
P1 — should fix before a serious public beta
P2 — meaningful improvement, not blocking
P3 — polish / optional
```

Also classify the recommended action:

```text
FIX
SIMPLIFY
REMOVE
FREEZE
DEFER
KEEP
```

A finding that says:

> KEEP — this is already good; stop touching it

is valuable.

# 19. Evidence discipline

Base findings on actual repository evidence.

For every important technical claim, identify:

- relevant file;
- component/module;
- data flow;
- concrete behavior.

Do not claim something exists if you did not locate it.

Use:

```text
NOT FOUND
UNVERIFIED
INFERRED
```

where appropriate.

Do not fill gaps with generic best practices.

# 20. Review-first rule

During the first review:

**DO NOT MODIFY FILES.**

Do not:

- refactor;
- run migrations that alter data;
- redesign screens;
- replace dependencies;
- rewrite components;
- add features.

You may inspect and, if your environment permits, run non-destructive checks/tests.

But the first deliverable is an audit, not a patch.

# 21. Desired final outcome

The purpose of the review is to answer:

> What is the shortest, safest path from the current Leo Tree to a coherent, stable, lovable first public version?

The answer may be:

- fix five things;
- remove three things;
- freeze twenty things;
- defer everything else.

That is preferable to a large roadmap.

Leo Tree should become:

```text
smaller in conceptual noise,
stronger in structure,
calmer in interaction,
and easier to trust.
```

# 22. Final principle

When these conflict:

```text
more features
vs
clearer product
```

choose clearer product.

When these conflict:

```text
more visual decoration
vs
better knowledge structure
```

choose knowledge structure.

When these conflict:

```text
garden metaphor
vs
precise semantics
```

choose precise semantics.

When these conflict:

```text
clever architecture
vs
maintainable architecture
```

choose maintainable architecture.

When these conflict:

```text
future possibility
vs
current product quality
```

choose current product quality.

The job is not to make Leo Tree bigger.

The job is to determine what will make Leo Tree better.
