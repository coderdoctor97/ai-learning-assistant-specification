# SVG Icon & Tooltip Audit Dossier — Learning Studio

- **Project:** `ai-learning-studio` (Learning Studio)
- **Repo:** `coderdoctor97/ai-learning-assistant-specification`
- **Audited by:** `/audit-svg` skill (read-only) — no application code modified
- **Target Output:** `skills/svg-audit.md` (Icon & Tooltip Target Register)

---

## 1. Stack & Dependency Verification

| Dependency Category | Current State | Audit Finding | Recommendation |
| :--- | :--- | :--- | :--- |
| **Icon Library** | No third-party icon library (`lucide-react`, `@heroicons/react`, `@tabler/icons-react`, etc.) installed in `package.json`. | Icons are currently rendered via a single hand-rolled inline SVG component `src/components/ui/Icon.tsx` (22 stroke glyphs, 16×16 viewBox, `currentColor`, `aria-hidden="true"`). | Recommend installing `lucide-react` (or standardizing `Icon.tsx` to export standard Lucide-compatible stroke glyphs) for full icon diversity across actions, formats, and statuses. |
| **Tooltip Infrastructure** | No tooltip library (`@radix-ui/react-tooltip`, `@floating-ui/react`, etc.) installed. | Relying on native HTML `title="..."` attributes and custom CSS popovers (`Popover.tsx`). Native titles fail on keyboard focus, touch devices, and cannot be styled. | Recommend installing `@radix-ui/react-tooltip` (or `@floating-ui/react`) for accessible, keyboard-focusable floating tooltips with configurable portal rendering, hover delays, and `aria-describedby` linkage. |
| **Utility Stack** | `clsx` (`^2.1.1`) and `tailwind-merge` (`^3.7.0`) installed. | Utility helper `@/lib/cn.ts` is available in `src/lib/cn.ts`. | Use `cn()` from `@/lib/cn` across all icon and tooltip wrapper components for safe class composition. |

---

## 2. UI Slot & Visual Gap Summary

A comprehensive scan across `src/components/` and `src/app/` identified **36 distinct UI slots** where SVG icons or accessible tooltips are missing, incomplete, or visually ambiguous:

1. **Sidebar Navigation & Rail (8 slots):**
   - Rail collapse/expand toggle triggers (rely on native titles, lack keyboard hint).
   - Rail New Session action (icon-only button lacks styled tooltip and shortcut hint).
   - Primary New Session panel button (lacks `shrink-0` on leading icon).
   - Add Project button (icon-only, small touch area).
   - Delete Project row action (hidden hover state, lacks confirmation tooltip).
   - Session row More menu trigger (rely on native title, lacks shortcut/options hint).
   - Pinned session star indicator (lacks informative status tooltip).
   - Settings footer/rail link (icon-only, relies on native title).

2. **TopBar & Header Controls (7 slots):**
   - Provider status chip (uses CSS dot instead of semantic status SVG icon).
   - Model picker dropdown trigger (chevron icon lacks smooth open/close rotation).
   - Model picker refresh provider button (refresh icon lacks spinning animation during discovery).
   - Context level clamped warning chip (lacks leading warning SVG icon).
   - Dynamic agent toggle button (text-only, lacks leading bot/sparkle icon).
   - Reasoning toggle button (text-only, lacks leading brain/lightbulb icon).
   - Theme radiogroup buttons (icon-only, rely on native titles).

3. **Stage Toolbar & Meta Cards (4 slots):**
   - Progression rail step pills (uses plain text checkmark `"✓"` instead of SVG icon; step instructions rely on native titles).
   - Edit stage prompt button (pencil icon lacks `shrink-0`; missing shortcut/explainer tooltip).
   - Section disclosure accordions (Reasoning, Sources, Learning State headers lack leading category icons).
   - Accordion chevron toggles (lack CSS rotation transition).

4. **Stage Deck Footer & Actions (5 slots):**
   - Copy stage content button (lacks copy success checkmark feedback state).
   - Regenerate stage button (refresh icon lacks spinning state when busy).
   - Stage modifier buttons (Longer, Shorter, Deeper are text-only; Deeper disabled state lacks explanatory tooltip).
   - Q&A User message edit button (ghost button relies on native title).
   - Q&A Assistant message copy & regenerate buttons (lack feedback states / tooltips).

5. **Stage Composer & Attachments (3 slots):**
   - Submit question button (paperplane icon lacks shortcut tooltip `⌘Enter`).
   - Attach file trigger (paperclip button lacks supported formats tooltip).
   - Remove attachment button (close cross lacks explicit trash/remove tooltip).

6. **Export Bar & New Session Cards (3 slots):**
   - Export format buttons (MD, ZIP, DOCX, PDF, HTML, TXT share generic download icon instead of format-specific SVG icons).
   - Methodology selection cards (lack visual radio checkmark affordance).
   - Model-ready warning banner (lacks leading alert icon).

7. **Settings & Overlays (6 slots):**
   - Provider card Test & Discover button (lacks spin animation).
   - Provider card Clear / Remove buttons (text-only, lack key/trash icons).
   - Methodology step reorder/remove buttons (rotated chevrons without tooltips).
   - Skill preview/import buttons (text-only, lack search/download icons).
   - Toast close action (icon button lacks tooltip).
   - Dialog & sheet overlays (missing top-right visual close trigger).

---

## 3. Layout & Stacking Trap Analysis

For every slot, parent container constraints dictate whether tooltips must use **Portal** (rendering at body root to bypass `overflow-hidden`, `overflow-y-auto`, or low `z-index`) or **CSS** (Tailwind `group-hover` / peer positioning in unconstrained parents):

- **Portal Strategy Required:**
  - **Sidebar & Rail:** Parent containers have fixed widths (`w-14` / `w-72`), `overflow-y-auto`, or `z-20` layer bounds. Tooltips in the rail or session list will be clipped or trigger unwanted scrollbars if rendered inside the parent DOM node.
  - **Dropdowns & Popovers:** Triggers inside `ModelPicker` listbox or `SessionMenu` popover need portal tooltips so tooltips do not get cut off by `overflow-y-auto` dropdown containers.
  - **Scrollable Stage Card & Tables:** Step rail on `StageToolbar` and step editors in `SettingsApp` scroll horizontally or vertically; tooltips must portal to `document.body`.
  - **Toast Stack & Dialog Overlays:** Fixed position overlays need top-z-index portaled tooltips.

- **CSS Strategy Safe:**
  - **TopBar Header Actions:** TopBar triggers (`Agent`, `Reasoning`, `Theme`) live in unconstrained flex containers near the top of the viewport with sufficient overflow room.
  - **Stage Footer Action Bar:** Buttons (`Copy`, `Regenerate`, `Longer`, `Shorter`) have unconstrained surrounding space inside the stage card footer.
  - **Composer Submit & Export Bar:** Unclipped horizontal flex bars with room for CSS-positioned tooltips.

- **Flex & Grid Layout Rules (`shrink-0` & `gap-x-*`):**
  - All SVG icons placed inside flex buttons or chips must include `shrink-0` to prevent SVG squishing when parent text wraps or flex containers shrink.
  - Interactive buttons with leading icons require explicit horizontal gap (`gap-x-1.5` or `gap-x-2`).

---

## 4. Accessibility Baseline Audit

The accessibility prescription for every slot enforces WCAG 2.2 AA compliance:

1. **Icon-only Buttons:** Must carry an explicit `aria-label` attribute describing the action (e.g. `aria-label="Expand sidebar"`, `aria-label="Delete project [name]"`). The tooltip element must be linked via `aria-describedby` or managed by Radix Tooltip Primitive.
2. **Decorative & Accompanying SVGs:** All SVG elements that accompany visible button/chip text must have `aria-hidden="true"` to prevent screen readers from announcing duplicate or empty graphics.
3. **Stateful Toggles:** Buttons representing toggles must carry ARIA state attributes (`aria-pressed="true|false"`, `aria-expanded="true|false"`, `aria-busy="true|false"`, `aria-selected="true|false"`).
4. **Keyboard Accessibility:** Tooltips must trigger on both `:hover` and `:focus-visible`, allowing keyboard users navigating with `Tab` to read action descriptions and shortcut hints.

---

## 5. Icon & Tooltip Target Register

| Element Ref / Location | Existing Code Snippet | Visual Deficiency & Context | Recommended SVG Icon | Recommended Tooltip Copy | Tooltip Strategy (Portal vs. CSS) | Accessibility Prescription |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Sidebar.tsx:189` (Rail Expand) | `<button className="icon-btn" onClick={...} title={t("sidebar.expand")} aria-label={t("sidebar.expand")}><Icon name="menu" /></button>` | Icon-only toggle button in collapsed rail. Relies on native unstyled browser `title`. | `PanelLeftOpen` (Lucide) | "Expand sidebar (⌘B)" | Portal (inside narrow 56px rail) | `aria-label="Expand sidebar"`, link tooltip via `aria-describedby` |
| `Sidebar.tsx:232` (Panel Collapse) | `<button className="icon-btn ml-auto" onClick={...} title={t("sidebar.collapse")} aria-label={t("sidebar.collapse")}><Icon name="chevronLeft" /></button>` | Icon-only chevron button inside panel header. Uses native `title`. | `PanelLeftClose` (Lucide) | "Collapse sidebar (⌘B)" | Portal (inside panel header flex) | `aria-label="Collapse sidebar"`, `aria-describedby="tooltip-id"` |
| `Sidebar.tsx:200` (Rail New Session) | `<button className="icon-btn bg-accent text-on-accent" onClick={handleNew} title={t("sidebar.newSessionShort")}><Icon name="plus" /></button>` | High-priority primary action in rail. Native `title` lacks shortcut details and styling. | `SquarePlus` or `Plus` (Lucide) | "Create new learning session (⌘N)" | Portal (rail overflow bounds) | `aria-label="Create new learning session"` |
| `Sidebar.tsx:243` (Panel New Session) | `<button className="btn btn-primary w-full" onClick={handleNew}><Icon name="plus" /> {t("sidebar.newSession")}</button>` | Primary full-width button. Leading plus icon lacks `shrink-0` and tooltip shortcut hint. | `Plus` (Lucide) leading `shrink-0` | "Start new session with custom topic (⌘N)" | CSS (full width panel container) | `aria-hidden="true"` on SVG icon; visible text handles primary label |
| `Sidebar.tsx:261` (Add Project) | `<button className="icon-btn" onClick={...} aria-label={t("sidebar.projects.add")} title={t("sidebar.projects.add")}><Icon name="plus" /></button>` | Icon-only button beside "Projects" section label. Small target area, native title. | `FolderPlus` (Lucide) | "Create a new project folder" | Portal (inside scrollable sidebar) | `aria-label="Create new project folder"`, `aria-expanded={creatingProject}` |
| `Sidebar.tsx:314` (Delete Project) | `<button className="icon-btn row-action absolute right-1 top-1" onClick={...} aria-label={`...`}><Icon name="close" /></button>` | Row hover action button. Uses generic close cross instead of trash affordance; no tooltip. | `Trash2` (Lucide) | "Delete project and unassign sessions" | Portal (inside scrollable project item) | `aria-label="Delete project [name]"`, `role="button"` |
| `Sidebar.tsx:123` (Session More Menu) | `<Popover.Trigger className="icon-btn row-action absolute right-1 top-1 z-20" hasPopup="menu" title={t("sidebar.session.actions")}><Icon name="more" /></Popover.Trigger>` | Three-dots icon trigger inside session list item. Native title; no shortcut hint. | `MoreHorizontal` (Lucide) | "Session options (Pin, Rename, Move, Delete)" | Portal (inside scrollable list cell) | `aria-label="Session options for [Session Title]"`, `aria-haspopup="menu"` |
| `Sidebar.tsx:149` (Pinned Star Indicator) | `<span className="text-accent" aria-label={t("sidebar.pinned")}><Icon name="star" /></span>` | Non-interactive status star icon inside session title row. Lacks tooltip explaining status. | `Star` (Lucide) filled | "Pinned session" | Portal (inside scrollable list item) | `aria-hidden="true"` on SVG; parent span has `aria-label="Pinned"` |
| `Sidebar.tsx:208` (Rail Settings Link) | `<Link href="/settings" className="icon-btn" title={t("sidebar.settings")}><Icon name="settings" /></Link>` | Icon-only navigation link at rail bottom. Native title; no shortcut hint. | `Settings` (Lucide) | "Open app settings (⌘,)" | Portal (rail bottom bounds) | `aria-label="Open application settings"` |
| `TopBar.tsx:217` (Provider Chip) | `<Link href="/settings" className="provider-chip" title={...}><span className="status-led" data-tone={statusTone} aria-hidden="true" />...</Link>` | Uses CSS dot (`status-led`) without semantic status icon. Native title only. | `CheckCircle2` (Connected) / `AlertTriangle` (Error) / `Circle` (Disconnected) | "Provider status: Connected via OpenAI (Click to configure)" | CSS (TopBar unconstrained header) | `aria-label="Provider status: [Name], [Status]. Click to manage settings."` |
| `TopBar.tsx:232` (Model Picker Trigger) | `<Popover.Trigger className="btn btn-xs" hasPopup="listbox" disabled={busy}><span className="...">...</span><Icon name="chevronDown" className="text-muted" /></Popover.Trigger>` | Dropdown trigger button. Chevron icon lacks `shrink-0` and open rotation transition. | `ChevronDown` (Lucide) `shrink-0 transition-transform data-[state=open]:rotate-180` | "Select active language model" | CSS (TopBar header context) | `aria-haspopup="listbox"`, `aria-expanded` state on trigger |
| `TopBar.tsx:263` (Refresh Provider) | `<button className="chip hover:border-accent" disabled={...} aria-busy={...} title={...}><Icon name="refresh" /> {provider.name}</button>` | Refresh button inside model picker popover. Icon does not spin when `aria-busy` is true. | `RefreshCw` (Lucide) with `animate-spin` when busy | "Re-discover available models from [Provider]" | Portal (inside popover dropdown surface) | `aria-busy={discovering === provider.id}`, `aria-label="Refresh models for [Provider]"` |
| `TopBar.tsx:291` (Clamped Context Chip) | `<span className="chip chip-warn" title={...}>{t("topbar.context.clamped", ...)}</span>` | Warning chip text without leading warning icon. Relies on native title tooltip. | `AlertTriangle` (Lucide) leading `shrink-0` | "Active model context limit (128k) is lower than selected setting" | CSS (TopBar header context) | `role="status"`, `aria-label="Warning: Context limit clamped to [limit]"` |
| `TopBar.tsx:301` (Dynamic Agent Toggle) | `<button className="btn btn-xs" aria-pressed={agentOn} onClick={...} title={t("topbar.agent.title")}>{t("topbar.agent.label", ...)}</button>` | Text-only agent toggle button. Lacks leading agent/bot icon affordance. | `Bot` or `Sparkles` (Lucide) leading `shrink-0` | "Toggle dynamic AI agent stage planning" | CSS (TopBar header context) | `aria-pressed={agentOn}`, `aria-label="Dynamic Agent [On/Off]"` |
| `TopBar.tsx:313` (Reasoning Toggle) | `<button className="btn btn-xs" aria-pressed={...} disabled={!capabilities.reasoning} onClick={...} title={...}>{t("topbar.reasoning.label")}</button>` | Text-only button. Lacks visual icon when enabled or explanation when unsupported. | `Brain` or `Lightbulb` (Lucide) leading `shrink-0` | "Toggle extended reasoning / thinking mode (requires model support)" | CSS (TopBar header context) | `aria-pressed={reasoningOn}`, `aria-disabled={!capabilities.reasoning}` |
| `TopBar.tsx:332` (Theme Switcher Radios) | `<button key={theme.key} type="button" role="radio" aria-checked={...} className="theme-option" title={...}><Icon name={theme.icon} /></button>` | Icon-only radio buttons for theme selection. Relies on native titles. | `Sun`, `Moon`, `BookOpen` (Lucide) | "Switch theme: Light / Dark / Editorial" | CSS (TopBar right side) | `role="radio"`, `aria-checked={active}`, `aria-label="Theme: [Name]"` |
| `StageToolbar.tsx:76` (Step Rail Pills) | `<button key={...} className="step-pill ..." aria-current={...} title={entry.instructions}><span className="step-dot">{generated ? "✓" : index + 1}</span>...</button>` | Step dot uses plain text checkmark `"✓"`; step instructions rely on native title. | `Check` (Lucide) SVG icon inside step dot | "Stage [N]: [Title] — [Instructions]" | Portal (stage rail horizontal scrollable) | `aria-current="step"`, `aria-hidden="true"` on check SVG icon |
| `StageMeta.tsx:32` (Edit Stage Prompt) | `<button type="button" className="btn btn-ghost btn-xs" aria-expanded={editing} onClick={...}><Icon name="pencil" />{t("stage.editPrompt")}</button>` | Action button with leading pencil icon. Icon lacks `shrink-0`; no prompt hint tooltip. | `Pencil` (Lucide) leading `shrink-0` | "Customize instructions and title for this stage" | CSS (unconstrained stage card header) | `aria-expanded={editing}`, `aria-hidden="true"` on SVG icon |
| `StageDeck.tsx:186` (Copy Stage Content) | `<button type="button" className="btn btn-xs" onClick={() => copy(stage.content)}><Icon name="copy" />{t("stage.copy")}</button>` | Plain button with copy icon. Missing temporary success state icon (`Check`) on click. | `Copy` / `Check` (Lucide) state transition | "Copy stage content as formatted Markdown" | CSS (stage card footer bar) | `aria-label="Copy stage content to clipboard"`, `aria-hidden="true"` on SVG |
| `StageDeck.tsx:190` (Regenerate Stage) | `<button type="button" className="btn btn-xs" disabled={busy} onClick={() => onGenerate(stageIndex, "none")}><Icon name="refresh" />{t("stage.regenerate")}</button>` | Refresh button. Icon lacks spinning animation during active regeneration state. | `RotateCw` (Lucide) with `animate-spin` when busy | "Re-generate response for this stage using active model" | CSS (stage card footer bar) | `aria-busy={busy}`, `aria-hidden="true"` on SVG icon |
| `StageDeck.tsx:198` (Stage Modifiers) | `<button type="button" className="btn btn-xs" disabled={busy} onClick={() => onGenerate(stageIndex, "longer")}>{t("stage.longer")}</button>` | Text-only modifier buttons ("Longer", "Shorter", "Deeper"). Deeper disabled state lacks tooltip explanation. | `Maximize2` (Longer), `Minimize2` (Shorter), `Sparkles` (Deeper) | "Longer: Expand detail" / "Shorter: Summarize" / "Deeper: Deep reasoning" | CSS (stage card footer bar) | `aria-disabled={!deeperAvailable}`, link tooltip via `aria-describedby` |
| `Collapsible.tsx:20` (Disclosure Accordion) | `<button type="button" className="fold-head" aria-expanded={open}><span className="fold-chevron"><Icon name="chevronDown" /></span><span>{title}</span>...</button>` | Accordion chevron lacks smooth CSS rotation transition; headers lack category icons. | `ChevronDown` (Lucide) `data-[state=open]:rotate-180` + `Brain`/`BookOpen`/`Activity` | "Toggle [Reasoning / Sources / State] section" | CSS (unconstrained accordion container) | `aria-expanded={open}`, `aria-controls={panelId}` |
| `QaThread.tsx:53` (Edit User Question) | `<button type="button" className="btn btn-ghost btn-xs" disabled={busy} title={t("stage.qa.editTitle")}><Icon name="pencil" />{t("stage.qa.edit")}</button>` | Ghost button in user message bubble. Uses native title tooltip. | `Pencil` (Lucide) | "Edit question and replace response" | CSS / Portal (inside message bubble) | `aria-label="Edit question: [content snippet]"` |
| `QaThread.tsx:65` (Copy Assistant Answer) | `<button type="button" className="btn btn-ghost btn-xs" onClick={() => onCopy(message.content)}><Icon name="copy" />{t("stage.copy")}</button>` | Ghost copy button in assistant bubble. Lacks copy success checkmark feedback. | `Copy` / `Check` (Lucide) | "Copy answer to clipboard" | CSS (inside message actions bar) | `aria-label="Copy assistant answer to clipboard"` |
| `QaThread.tsx:74` (Regenerate Answer) | `<button type="button" className="btn btn-ghost btn-xs" disabled={busy} title={t("stage.qa.regenerateTitle")}><Icon name="refresh" />{t("stage.regenerate")}</button>` | Ghost refresh button in assistant bubble. Relies on native title. | `RotateCw` (Lucide) | "Re-send question to generate new answer" | CSS (inside message actions bar) | `aria-label="Regenerate answer for: [asked question]"` |
| `Composer.tsx:28` (Submit Question) | `<button className="btn btn-primary ml-auto" type="submit" disabled={busy || !value.trim()} aria-busy={busy}><Icon name="send" />{t("stage.qa.send")}</button>` | Primary submit button with paper plane icon. Missing shortcut tooltip (`⌘Enter`). | `Send` or `CornerDownLeft` (Lucide) | "Send question (⌘+Enter)" | CSS (composer action bar) | `aria-busy={busy}`, `aria-disabled={busy || !value.trim()}` |
| `AttachmentRow.tsx:33` (Attach File) | `<button type="button" className="btn btn-xs" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="paperclip" />{t("stage.attach.button")}</button>` | Attach button with paperclip icon. Lacks detailed tooltip on supported file formats. | `Paperclip` or `Upload` (Lucide) | "Attach documents or images (.pdf, .docx, .md, .png, .jpg)" | CSS / Portal (attachment toolbar) | `aria-label="Attach documents or images to stage"` |
| `AttachmentRow.tsx:65` (Remove Attachment) | `<button type="button" className="icon-btn" onClick={() => onDeleteAttachment(attachment.id)} aria-label={t("stage.attach.remove", { name: attachment.name })}><Icon name="close" /></button>` | Icon-only button on attachment chip. Uses close cross instead of trash icon; no tooltip. | `X` or `Trash2` (Lucide) | "Remove attachment [name]" | Portal (inside scrollable attachment list) | `aria-label="Remove attachment [name]"` |
| `ExportBar.tsx:22` (Export Format Links) | `<a key={format} className="btn btn-xs" href={`...`}><Icon name="download" />{t(labelKey)}</a>` | All 6 export links share generic download icon instead of format-specific icons. | `FileText` (MD/TXT), `Archive` (ZIP), `FileSpreadsheet` (DOCX), `FileDown` (PDF), `Code2` (HTML) | "Download completed study session as [Format] file" | CSS (export panel container) | `aria-label="Export session as [Format]"` |
| `NewSession.tsx:143` (Methodology Cards) | `<button type="button" key={config.id} role="radio" aria-checked={active} className="config-card p-3" data-active={active}>...` | Radio cards lack a visual checkmark / radio icon SVG selection affordance. | `CheckCircle2` (Active) / `Circle` (Inactive) (Lucide) | "Select [Config Name] methodology" | CSS (grid container) | `role="radio"`, `aria-checked={active}` |
| `ProviderCard.tsx:247` (Test & Discover) | `<button type="button" className="btn btn-xs" disabled={busy} aria-busy={busy} onClick={...}><Icon name="refresh" />...</button>` | Discover models button. Refresh icon does not spin during active discovery. | `RefreshCw` (Lucide) with `animate-spin` when busy | "Ping provider API and discover available model IDs" | CSS (provider card footer) | `aria-busy={busy}`, `aria-label="Test connection and discover models for [Provider]"` |
| `ProviderCard.tsx:167` (Clear Key Action) | `<button type="button" className="btn btn-xs" onClick={...}>{t("settings.provider.keyClear")}</button>` | Text-only button for clearing stored API key without a key/remove icon. | `KeyRound` or `X` (Lucide) | "Clear saved API key from storage" | CSS (provider key input group) | `aria-label="Clear API key for [Provider]"` |
| `ProviderCard.tsx:214` (Remove Provider) | `<button type="button" className="btn btn-xs text-warn" onClick={() => setConfirmRemove(true)}>{t("settings.provider.remove")}</button>` | Text-only destructive button for removing a custom provider. | `Trash2` (Lucide) | "Remove provider configuration" | CSS (provider card footer) | `aria-label="Remove provider [Name]"` |
| `SettingsApp.tsx:136` (Move Step Up/Down) | `<button type="button" className="btn btn-ghost btn-xs" disabled={index === 0} aria-label={t("settings.methodology.moveUp")}><Icon name="chevronDown" className="rotate-180" /></button>` | Move step up/down buttons use rotated chevrons without tooltips. | `ArrowUp` (Move Up), `ArrowDown` (Move Down) | "Move step up in methodology sequence" / "Move step down" | Portal (inside scrollable step editor) | `aria-label="Move step [N] up"`, `aria-label="Move step [N] down"` |
| `SettingsApp.tsx:652` (Skill Preview/Import) | `<button type="button" className="btn btn-xs" disabled={!skillUrl.trim()}>{t("settings.skills.preview")}</button>` | Text-only buttons for Preview and Import skill actions without icons. | `Eye` or `Search` (Preview), `Download` or `Import` (Import) | "Fetch skill metadata from URL" / "Install skill into workspace" | CSS (skills management panel) | `aria-label="Preview skill from URL"`, `aria-label="Import skill into workspace"` |
| `ToastStack.tsx:73` (Toast Dismiss) | `<button type="button" className="icon-btn ml-2" onClick={() => onDismiss(toast.id)} aria-label={t("studio.toast.dismiss")}><Icon name="close" /></button>` | Toast dismiss button. Uses generic close icon without hover/focus tooltip. | `X` (Lucide) | "Dismiss notification" | Portal (fixed toast overlay) | `aria-label="Dismiss notification: [toast message]"` |
