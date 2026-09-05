# Leo Tree — Product Vision

## Product definition

Leo Tree is a personal knowledge-structure system. It helps a person turn a field of knowledge into a structure that can be decomposed, learned, revisited, practiced, corrected, and extended over time.

It is not primarily a note app, mind map, bookmark manager, course platform, generic document manager, Notion clone, or social network.

The core loop is:

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

## Product language

The user-facing metaphor is intentionally restrained:

- 园子: the user's collection of knowledge trees
- 知识树: one complete knowledge structure
- 分区: first-level organization
- 枝 / 枝干: local path or branch context
- 节点: an atomic knowledge unit

Actions may use lightweight phrases such as 开园, 栽树, 入园, and 修枝. The metaphor must not expand into a fantasy or gamified gardening system. User-facing actions may be poetic; data semantics must stay precise.

The internal model remains explicit: Workspace/Garden, KnowledgeTree, Section, Node, Branch/Path, Review, PracticeLog, Attachment, and Template.

Priority is stored and processed as `P0`–`P3`; 梅 / 兰 / 竹 / 菊 are display aliases only. Learning state remains explicit as □ 未学, △ 在学, and ✓ 掌握.

## Product commitments

The following directions are approximately frozen unless a serious product or technical flaw is demonstrated:

- Leo Tree name
- The garden/tree metaphor at its current intensity
- “我的 / 社区 / 设置” bottom navigation
- Knowledge Tree / Weekly Review / Practice Log
- P0 梅 / P1 兰 / P2 竹 / P3 菊 display
- □ / △ / ✓ learning states
- Warm paper, restrained ink, cinnabar, low saturation, and botanical visual identity
- Local-first behavior
- SNN as a template/example rather than the application domain
- Section-to-node organization and arbitrary-depth nodes
- A restrained community flow: browse → inspect → bring a useful tree into one's own garden

## Current phase

Leo Tree is an early independent product moving from prototype toward a stable v0.x foundation. The immediate job is not feature expansion. It is to reduce conceptual noise, strengthen structure, calm the interaction model, and make the product easier to trust.

The main review pressures are:

- Dense node detail/editing on mobile
- Structural maintenance controls competing with reading and learning
- Attachment UI receiving too much visual weight
- Bottom navigation and safe-area behavior
- Long and deeply nested trees
- Local persistence, schema migration, import/export, and overwrite safety
- Separation between domain operations, persistence, and UI for possible future Leo AI integration

## Non-goals for this phase

Do not make immediate plans for AI tree generation, an in-product chat assistant, vector databases, a graph canvas, real-time collaboration, comments, likes, followers, feeds, ranking, paid marketplaces, gamification, complex cloud sync, microservices, or a framework rewrite.

Future possibility must not displace current product quality.

## Decision principles

- More features vs clearer product: choose clearer product.
- More decoration vs better knowledge structure: choose knowledge structure.
- Garden metaphor vs precise semantics: choose precise semantics.
- Clever architecture vs maintainable architecture: choose maintainable architecture.
- Future possibility vs current product quality: choose current product quality.

The shortest safe path to a public version may be to fix a few things, remove a few things, freeze many things, and defer everything else.
