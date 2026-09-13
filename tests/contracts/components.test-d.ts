/*
 * Prop-contract pinning (playwright-component-testing workstream).
 *
 * These are compile-time assertions only: `npm run typecheck` fails if any
 * component's public prop contract drifts. Behavioral refactors (e.g. the
 * StageDeck decomposition) must keep these types byte-equivalent.
 *
 * Every component below pins its full prop-name union and the shape of the
 * load-bearing fields (callbacks, run state, capability map).
 */

import type { Markdown } from "@/components/Markdown";
import type { NewSession } from "@/components/studio/NewSession";
import type { RunState, StageDeck } from "@/components/studio/StageDeck";
import type { Sidebar } from "@/components/studio/Sidebar";
import type { TopBar } from "@/components/studio/TopBar";
import type { SettingsApp } from "@/components/settings/SettingsApp";
import type { StudioApp } from "@/components/studio/StudioApp";
import type { Capabilities } from "@/lib/client/api";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<Condition extends true> = Condition;

type PropsOf<Component> = Component extends (props: infer P) => unknown ? P : never;

/* -- StageDeck ------------------------------------------------------ */
type StageDeckProps = PropsOf<typeof StageDeck>;
type _StageDeckKeys = Assert<
  Equal<
    keyof StageDeckProps,
    | "detail"
    | "stageIndex"
    | "onStageIndex"
    | "run"
    | "capabilities"
    | "reasoningEnabled"
    | "agentOn"
    | "onGenerate"
    | "onAsk"
    | "onEditStep"
    | "onUpload"
    | "onDeleteAttachment"
    | "notify"
  >
>;
type _StageDeckGenerate = Assert<
  Equal<StageDeckProps["onGenerate"], (index: number, modifier: "none" | "longer" | "shorter" | "deeper") => Promise<void>>
>;
type _StageDeckAsk = Assert<Equal<StageDeckProps["onAsk"], (stageId: string, question: string) => Promise<void>>>;
type _StageDeckEdit = Assert<
  Equal<StageDeckProps["onEditStep"], (index: number, title: string, instructions: string) => Promise<void>>
>;
type _StageDeckUpload = Assert<Equal<StageDeckProps["onUpload"], (file: File) => Promise<void>>>;
type _StageDeckRemove = Assert<Equal<StageDeckProps["onDeleteAttachment"], (id: string) => Promise<void>>>;
type _StageDeckNotify = Assert<Equal<StageDeckProps["notify"], (kind: "error" | "info", message: string) => void>>;

/* -- RunState (exported contract) ------------------------------------ */
type _RunStateShape = Assert<
  Equal<RunState, {
    mode: "stage" | "qa";
    stageIndex: number;
    status: string;
    text: string;
    reasoning: string;
    resources: { id: string; title: string; url: string; source: string; type: string; snippet?: string; retrievedAt?: string; query?: string }[];
  }>
>;

/* -- TopBar ----------------------------------------------------------- */
type TopBarProps = PropsOf<typeof TopBar>;
type _TopBarKeys = Assert<
  Equal<
    keyof TopBarProps,
    | "state"
    | "activeModel"
    | "activeProvider"
    | "capabilities"
    | "session"
    | "busy"
    | "onPatchSettings"
    | "onPatchSession"
    | "onDiscover"
  >
>;
type _TopBarPatch = Assert<Equal<TopBarProps["onPatchSettings"], (patch: Record<string, unknown>) => Promise<void>>>;

/* -- Sidebar ----------------------------------------------------------- */
type SidebarProps = PropsOf<typeof Sidebar>;
type _SidebarKeys = Assert<
  Equal<
    keyof SidebarProps,
    | "state"
    | "activeId"
    | "collapsed"
    | "onToggleCollapse"
    | "onSelect"
    | "onNew"
    | "onRefresh"
    | "notify"
    | "mobileOpen"
    | "onMobileClose"
    | "onMobileOpen"
  >
>;
type _SidebarMobileOptional = Assert<
  undefined extends SidebarProps["mobileOpen"] ? true : false
>;
type _SidebarMobileOpenOptional = Assert<
  undefined extends SidebarProps["onMobileOpen"] ? true : false
>;

/* -- NewSession --------------------------------------------------------- */
type NewSessionProps = PropsOf<typeof NewSession>;
type _NewSessionKeys = Assert<Equal<keyof NewSessionProps, "state" | "busy" | "onCreate">>;
type _NewSessionCreate = Assert<
  Equal<
    NewSessionProps["onCreate"],
    (input: { topic: string; configId: string | null; projectId: string | null; dynamicAgent: boolean }) => Promise<void>
  >
>;

/* -- SettingsApp / StudioApp (render-only contracts) --------------------- */
type _Settings = Assert<Equal<typeof SettingsApp, () => React.JSX.Element>>;
type _Studio = Assert<Equal<typeof StudioApp, () => React.JSX.Element>>;

/* -- Markdown ------------------------------------------------------------- */
type MarkdownProps = PropsOf<typeof Markdown>;
type _MarkdownKeys = Assert<Equal<keyof MarkdownProps, "children" | "className">>;
type _MarkdownClassOptional = Assert<Equal<MarkdownProps["className"], string | undefined>>;

/* -- Capabilities (provider metadata contract) ------------------------------ */
type _CapabilitiesKeys = Assert<
  Equal<keyof Capabilities, "vision" | "voice" | "reasoning" | "tools" | "streaming" | "documents">
>;
type _CapabilitiesBooleans = Assert<Equal<Capabilities[keyof Capabilities], boolean>>;

/* Ensure the asserted names stay referenced even under noUnusedLocals. */
export type ContractSuite = [
  _StageDeckKeys,
  _StageDeckGenerate,
  _StageDeckAsk,
  _StageDeckEdit,
  _StageDeckUpload,
  _StageDeckRemove,
  _StageDeckNotify,
  _RunStateShape,
  _TopBarKeys,
  _TopBarPatch,
  _SidebarKeys,
  _SidebarMobileOptional,
  _SidebarMobileOpenOptional,
  _NewSessionKeys,
  _NewSessionCreate,
  _Settings,
  _Studio,
  _MarkdownKeys,
  _MarkdownClassOptional,
  _CapabilitiesKeys,
  _CapabilitiesBooleans,
];
