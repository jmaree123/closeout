# CloseOut Design Brief
### Boronia Consulting — Action & Finding Close-Out Tracker
### Design Authority Document for UI Agents

**Target sector:** Energy, subsea, marine — safety-critical, professional B2B
**Design philosophy:** Bloomberg terminal meets Linear. Dense, information-rich, zero whimsy.
**Tech stack:** React 19, Tailwind CSS 4, @dnd-kit, @tanstack/react-table, @tanstack/react-virtual, Recharts, Zustand, Dexie (IndexedDB)

---

## 1. Status Workflow Best Practices

### Defined States (in order)

| Status | Colour | Token | Meaning |
|---|---|---|---|
| Open | Blue `#3B82F6` | `status-open` | Newly created, not yet actioned |
| In Progress | Amber `#F59E0B` | `status-in-progress` | Assigned and being worked on |
| Pending Verification | Purple `#8B5CF6` | `status-pending` | Work done, awaiting sign-off |
| Closed | Green `#10B981` | `status-closed` | Verified and closed out |
| Cancelled | Grey `#9CA3AF` | `status-cancelled` | No longer required |
| Overdue | Red `#EF4444` | `status-overdue` | Computed flag, not a user-set status |

### Allowed Transitions

```
Open  -->  In Progress  -->  Pending Verification  -->  Closed
  |            |                     |
  |            v                     v
  +-------> Cancelled           In Progress (rejected back)
  |
  +-------> Closed (if trivial / no action needed)
```

- **Forward transitions** are the default and require a single click
- **Backward transitions** (e.g. Pending Verification --> In Progress) require a confirmation reason (text field, mandatory, min 10 chars) -- modelled on SafetyCulture rejection workflow
- **Overdue** is never set manually; it is a computed overlay when `dueDate < today && status !== 'Closed' && status !== 'Cancelled'`
- **Cancelled** is a terminal state; items cannot be un-cancelled (create a new item instead)
- **Closed** is terminal unless the user has "Reopen" permission

### UI Patterns (sourced from Linear + Jira)

- Status shown as a **coloured dot + label** (Linear-style), not a full-width badge
- Clicking the status dot opens an **inline dropdown** with only valid next states
- Transition animation: dot colour cross-fades over 200ms (Linear)
- On the kanban board, dragging a card between columns triggers the same transition logic
- Show a **toast notification** on status change: `"Item #1042 moved to In Progress"` — auto-dismiss 3s
- Audit trail: every status change is logged with timestamp, user, previous status, new status, and optional comment

---

## 2. Kanban Board UX Patterns

### Column Design (from Jira + Linear + Planner)

- **One column per status** (excluding Overdue, which is a visual overlay)
- Column order: Open | In Progress | Pending Verification | Closed | Cancelled
- Column header: status dot + label + item count badge (e.g. `In Progress  12`)
- Column width: fixed at `280px` min, cards fill width with `8px` horizontal padding
- **Collapsed columns**: Cancelled and Closed can be collapsed to a `44px` vertical strip showing the status label rotated 90deg + count — click to expand (Jira pattern)
- Column background: `#F1F5F9` (slightly darker than page background `#F8F9FA`)
- Max visible cards before scrolling: use container-level vertical scroll per column (not page scroll)

### Card Design (from Linear + Asana)

- Card dimensions: full column width, auto-height, `12px` vertical padding, `16px` horizontal padding
- **Content hierarchy (top to bottom):**
  1. **Title** — 14px/600, single line, truncate with ellipsis
  2. **Meta row** — 12px/400, muted grey: `#1042 · Pipeline Repair · Due 15 Mar`
  3. **Tag row** — small pills: risk level (coloured), source system, discipline
  4. **Footer row** — avatar circle (24px) for assignee + priority indicator (if applicable)
- Card background: `#FFFFFF`, border: `1px solid #E2E8F0`, border-radius: `8px`
- **Overdue indicator**: left border changes to `3px solid #EF4444` (red) — like Jira's flagged items
- Card hover: subtle `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`, cursor: grab
- Card click: opens the detail panel (right-side slide-over, not a modal)

### Drag-and-Drop (using @dnd-kit)

- Drag handle: entire card is draggable (Linear pattern), no separate grip icon
- While dragging: card has `opacity: 0.9`, elevated shadow `0 8px 24px rgba(0,0,0,0.15)`, rotated `2deg`
- Drop placeholder: dashed border `2px dashed #CBD5E1` at insertion point
- Invalid drop zone: column header flashes red briefly, card snaps back with spring animation
- Transition validation: if a backward transition is attempted via drag, show a confirmation toast before committing
- Keyboard: Tab to select card, Space to pick up, Arrow keys to move, Space to drop (a11y)

---

## 3. Item Detail Panel Layout

### Panel Structure (from Asana + Linear)

- **Panel type**: right-side slide-over, width `520px`, full height
- **Overlay**: page behind dims to `rgba(0,0,0,0.2)` — click outside or press Esc to close
- **Transition**: slides in from right, 250ms ease-out

### Above-the-Fold Content (no scrolling needed)

```
+--------------------------------------------------+
| [<-- Back]                    [X Close]           |
|                                                   |
| # Finding Title (editable, click to edit)         |
| ID: #1042  |  Created: 12 Jan 2026               |
|                                                   |
| [Status: ● In Progress v]  [Priority: High v]    |
|                                                   |
| Assigned to: [Avatar] John Smith [change]         |
| Due date:    15 Mar 2026 [calendar picker]        |
| Department:  Subsea Operations [dropdown]         |
| Location:    Platform Alpha [dropdown]            |
+--------------------------------------------------+
```

### Below-the-Fold Sections (scrollable, collapsible)

Each section has a chevron toggle and item count where relevant:

1. **Description** — rich text area, inline editable, supports markdown
2. **Risk Assessment** — consequence + likelihood dropdowns, auto-calculated risk score, mini risk matrix showing current position
3. **Evidence / Attachments** — file list with thumbnails, drag-to-upload zone, file type icons
4. **Linked Items** — related findings, parent audit, source document
5. **Activity / Audit Log** — chronological feed of all changes, comments, status transitions (Asana-style)
6. **Comments** — threaded, with @-mentions, newest at bottom

### Inline Editing Patterns (from Linear)

- All text fields: click to enter edit mode, border appears, auto-focus
- Dropdowns: single-click opens, selection auto-saves
- Date fields: click opens a date picker popover (use native `<input type="date">` styled with Tailwind, or a custom calendar component)
- **Auto-save**: all changes save immediately with a subtle `Saved` indicator (green check, fades after 1.5s) — no explicit Save button (Linear pattern)
- **Undo**: Ctrl+Z within 5 seconds of a change reverts it; show "Change reverted" toast

---

## 4. Filter Bar Patterns

### Layout (from Jira + Linear)

- Position: sticky top bar below the page header, above the data area
- Height: `48px`, background: `#FFFFFF`, bottom border: `1px solid #E2E8F0`
- Layout: horizontal flex, left-aligned filters, right-aligned view controls

### Filter Controls

```
[Search icon] [Search field........]  [Status v] [Priority v] [Assignee v] [Due Date v] [Department v] [Location v]  |  [Clear All]  |  [Grid] [Kanban] [List]
```

- **Search**: 240px min-width, placeholder "Search items...", debounced 300ms, searches title + description + ID
- **Dropdown filters**: click to open a popover with checkboxes for multi-select (Jira pattern)
- **Date filter**: preset options (Overdue, Due This Week, Due This Month, Custom Range)
- **Active filter chips**: when a filter is active, show it as a removable chip below the filter bar
  - Chip design: `bg-boronia-navy/10 text-boronia-navy`, pill shape, `X` to remove
  - Example: `Status: In Progress X` `Assignee: John Smith X` `[Clear All Filters]`
- **Clear All**: ghost button, only visible when at least one filter is active
- **Persistent filters**: filters are preserved in URL query params so they survive page refresh and can be shared
- **Saved filters**: allow naming and saving filter combinations (future feature, reserve UI space)

### Visual States

- Inactive filter button: `bg-white border border-gray-200 text-gray-700`
- Active filter button: `bg-boronia-navy/10 border-boronia-navy/30 text-boronia-navy font-medium`
- Filter count badge: small circle with count when multiple values selected (e.g. `Status 2`)

---

## 5. Data Grid Patterns

### Grid Architecture (using @tanstack/react-table + @tanstack/react-virtual)

- **Virtual scrolling**: mandatory — the register may contain 10,000+ items
- Row height: `44px` fixed for virtual scrolling calculations
- Header height: `40px`, sticky, `bg-gray-50 border-b-2 border-gray-200`
- **Default visible columns**: ID, Title (wide), Status, Risk Level, Assignee, Due Date, Department, Location
- Additional columns available via column chooser: Source, Created Date, Last Modified, Priority, Description (truncated)

### Column Behaviour

- **Sortable**: click header to sort (asc -> desc -> none cycle), sort arrow indicator in header
- **Resizable**: drag column border to resize, double-click to auto-fit
- **Reorderable**: drag column headers to reorder (lower priority, can defer)
- **Column chooser**: gear icon in top-right of grid opens a checklist popover to show/hide columns

### Inline Editing (from Jira grid view)

- **Double-click** a cell to enter edit mode (not single-click, to avoid accidental edits)
- Edit mode: cell expands slightly, shows appropriate input (text, dropdown, date picker)
- **Tab** to move to next editable cell, **Enter** to confirm, **Esc** to cancel
- Auto-save on blur
- Only certain columns are editable inline: Status, Assignee, Due Date, Priority, Department, Location
- Title and Description: click to open the detail panel instead

### Bulk Selection (from Jira + Asana)

- Checkbox column on the far left
- **Select all**: header checkbox selects all visible (filtered) items, NOT all items in database
- **Shift+click**: range selection
- **Bulk action bar**: appears as a floating bar at the bottom of the screen when items are selected
  - Bar content: `{n} items selected` | `[Set Status v]` `[Assign v]` `[Set Due Date]` `[Delete]` | `[Deselect All]`
  - Bar design: `bg-boronia-navy text-white`, rounded-lg, shadow-xl, 60px from bottom, centered
  - Transitions: slides up 200ms when selection starts, slides down when deselected

### Row Colouring Conventions

- Default: alternating `#FFFFFF` and `#FAFBFC`
- Overdue items: `bg-red-50` left-to-right with `border-l-3 border-red-500`
- Selected items: `bg-blue-50`
- Hovered row: `bg-gray-50`
- Status column: show coloured dot (same as kanban), not a full coloured cell

---

## 6. Heat Map / Risk Matrix UX

### Matrix Structure (from SafetyCulture + Enablon + ISO 31000)

- **5x5 grid**: Likelihood (Y-axis, bottom to top: 1-Rare to 5-Almost Certain) x Consequence (X-axis, left to right: 1-Insignificant to 5-Catastrophic)
- Axis labels shown on both the outside edge and as row/column headers
- Cell size: minimum `80px x 80px`, responsive up to `120px x 120px`

### Cell Colouring (risk score = likelihood x consequence)

| Risk Score Range | Colour | Token | Label |
|---|---|---|---|
| 1-4 | Green `#22C55E` | `risk-low` | Low |
| 5-9 | Yellow `#EAB308` | `risk-medium` | Medium |
| 10-16 | Orange `#F97316` | `risk-high` | High |
| 17-25 | Red `#DC2626` | `risk-critical` | Critical |

- Cell background uses the risk colour at **20% opacity** (`bg-risk-critical/20`)
- Cell border: `1px solid` at **40% opacity** of the risk colour

### Item Representation (from Enablon + Cority patterns)

- **Dot cluster** approach (not numbers): each item is a `10px` filled circle in the cell
- Dots use `boronia-navy` colour (not the risk colour, for contrast)
- When cell has 1-6 items: show individual dots in a flex-wrap grid
- When cell has 7+ items: show a single dot with a number label (e.g. `23`)
- **Hover on cell**: tooltip shows the count and risk label: `"4 items — High Risk (L3 x C4)"`
- **Click on cell**: filters the register / kanban to show only items in that cell
- **Hover on individual dot**: shows item title + ID in a tooltip

### Matrix Interactions

- The matrix is a **clickable filter** — clicking a cell acts like applying a filter
- Active cell: thicker border (`3px solid`), slight scale up (`transform: scale(1.05)`)
- Option to overlay "before vs after" for items that have been mitigated (future, reserve space)
- Print-friendly: risk matrix should render cleanly at A4 landscape via `@media print`

---

## 7. Dashboard KPI Card Design Patterns

### Card Grid Layout

- **4 columns** on desktop (>1280px), 2 columns on tablet, 1 column on mobile
- Gap: `16px`
- Card dimensions: auto width (grid cell), height `120px` for KPI cards
- Card style: `bg-white rounded-lg border border-gray-200 shadow-sm p-5`

### KPI Card Anatomy (from Planner + Asana dashboards)

```
+-----------------------------------------------+
|  [Icon]  Total Open Items                     |
|                                               |
|  142                           [Spark chart]  |
|  ^12 from last month                          |
+-----------------------------------------------+
```

- **Top row**: category icon (16px, muted grey) + label (12px/500, `text-gray-500`, uppercase tracking-wide)
- **Main number**: 28px/700, `text-boronia-navy`
- **Trend indicator**: 12px/500
  - Up + bad (e.g. more overdue): `text-red-500`, `ArrowUpRight` icon
  - Down + good (e.g. fewer overdue): `text-green-600`, `ArrowDownRight` icon
  - Neutral: `text-gray-400`
- **Spark chart**: mini area chart (Recharts `<AreaChart>`) in the right third of the card, 60px tall, no axes, showing last 12 data points
  - Spark line colour matches the card's semantic colour
  - Fill: same colour at 10% opacity

### Recommended Dashboard KPI Cards

| Card | Icon | Metric | Spark data |
|---|---|---|---|
| Total Open | `CircleDot` | Count of non-closed/cancelled | Open items over last 6 months |
| Overdue | `AlertTriangle` | Count where due < today | Overdue count over last 6 months |
| Avg Days to Close | `Clock` | Mean close time | Rolling avg over last 6 months |
| Closed This Month | `CheckCircle` | Closed in current month | Monthly closed count |
| Critical/High Risk | `Shield` | Count of critical+high items open | Count over last 6 months |
| Pending Verification | `Eye` | Count awaiting sign-off | Count over last 6 months |

### Below KPI Cards

- **Status breakdown bar chart**: horizontal stacked bar showing proportion per status
- **Risk distribution donut chart**: 4-segment donut with risk colours
- **Overdue items table**: top 10 most overdue items, sorted by days overdue descending
- **Close-out trend line chart**: items opened vs closed per month, dual-line Recharts `<LineChart>`

---

## 8. Colour Palette and Typography

### Colour System

#### Brand Colours
| Name | Hex | Tailwind Token | Usage |
|---|---|---|---|
| Navy (Primary) | `#1E2A3A` | `boronia-navy` | Sidebar, headers, primary buttons, body text on white |
| Navy Light | `#2D3E54` | `boronia-navy-light` | Sidebar hover, secondary headers |
| Coral (Accent) | `#F06B6B` | `boronia-coral` | CTAs, primary action buttons, highlights, links |
| Coral Light | `#F59090` | `boronia-coral-light` | Hover state for coral buttons |

#### Background & Surface
| Name | Hex | Usage |
|---|---|---|
| Page Background | `#F8F9FA` | Main content area behind cards |
| Card Background | `#FFFFFF` | Cards, panels, modals, popovers |
| Sidebar Background | `#1E2A3A` | Left navigation sidebar |
| Table Header | `#F1F5F9` | Grid header row, kanban column background |
| Input Border | `#E2E8F0` | All input borders, card borders, dividers |
| Input Focus Border | `#3B82F6` | Focus ring for all interactive elements |

#### Status Colours
| Status | Hex | Token | Dot | Badge bg (10%) |
|---|---|---|---|---|
| Open | `#3B82F6` | `status-open` | Solid fill | `rgba(59,130,246,0.1)` |
| In Progress | `#F59E0B` | `status-in-progress` | Solid fill | `rgba(245,158,11,0.1)` |
| Pending Verification | `#8B5CF6` | `status-pending` | Solid fill | `rgba(139,92,246,0.1)` |
| Closed | `#10B981` | `status-closed` | Solid fill | `rgba(16,185,129,0.1)` |
| Cancelled | `#9CA3AF` | `status-cancelled` | Solid fill | `rgba(156,163,175,0.1)` |
| Overdue | `#EF4444` | `status-overdue` | Ring (outline) | `rgba(239,68,68,0.1)` |

#### Risk Colours
| Level | Hex | Token | Usage |
|---|---|---|---|
| Critical | `#DC2626` | `risk-critical` | Risk pills, matrix cells, alerts |
| High | `#F97316` | `risk-high` | Risk pills, matrix cells |
| Medium | `#EAB308` | `risk-medium` | Risk pills, matrix cells |
| Low | `#22C55E` | `risk-low` | Risk pills, matrix cells |

#### Semantic Colours
| Purpose | Hex | Usage |
|---|---|---|
| Success | `#10B981` | Save confirmations, positive trends |
| Warning | `#F59E0B` | Warnings, attention needed |
| Error | `#EF4444` | Validation errors, destructive actions |
| Info | `#3B82F6` | Informational banners, help text |

### Typography

#### Font Family
- **Primary**: `'Inter', ui-sans-serif, system-ui, sans-serif`
- Already loaded via Google Fonts in `index.html`
- Loaded weights: 400, 500, 600, 700

#### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing | Tailwind Classes |
|---|---|---|---|---|---|
| H1 (Page Title) | 24px | 700 | 32px | -0.025em | `text-2xl font-bold tracking-tight` |
| H2 (Section Title) | 18px | 600 | 28px | -0.015em | `text-lg font-semibold tracking-tight` |
| H3 (Card Title) | 16px | 600 | 24px | normal | `text-base font-semibold` |
| Body | 14px | 400 | 20px | normal | `text-sm font-normal` |
| Body Medium | 14px | 500 | 20px | normal | `text-sm font-medium` |
| Small / Caption | 12px | 400 | 16px | normal | `text-xs font-normal` |
| Data Cell | 13px | 500 | 18px | normal | `text-[13px] font-medium` |
| KPI Number | 28px | 700 | 36px | -0.03em | `text-[28px] font-bold tracking-tight` |
| Button | 14px | 500 | 20px | 0.01em | `text-sm font-medium tracking-wide` |
| Label / Overline | 11px | 600 | 16px | 0.05em | `text-[11px] font-semibold tracking-widest uppercase` |

### Button Styles

| Variant | Classes | Usage |
|---|---|---|
| Primary | `bg-boronia-coral hover:bg-boronia-coral-light text-white rounded-md px-4 py-2` | Main CTAs, Save, Create |
| Secondary | `bg-boronia-navy hover:bg-boronia-navy-light text-white rounded-md px-4 py-2` | Secondary actions, navigation |
| Outline | `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2` | Cancel, filter buttons |
| Ghost | `bg-transparent text-gray-600 hover:bg-gray-100 rounded-md px-4 py-2` | Tertiary actions, toolbar buttons |
| Danger | `bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2` | Delete, destructive actions |

### Spacing System

- Use Tailwind 4 spacing: `4px` base unit
- Component internal padding: `p-4` (16px) for cards, `p-5` (20px) for panels
- Gap between cards/sections: `gap-4` (16px)
- Page margin: `px-6 py-4` (24px horizontal, 16px vertical)

### Iconography

- **Library**: Lucide React (already installed)
- **Size**: 16px for inline, 20px for buttons, 24px for page headers
- **Stroke width**: 1.75 (default Lucide)
- **Colour**: inherit from text colour

### Sidebar Navigation

- Width: `240px`, collapsible to `64px` (icon-only mode)
- Background: `boronia-navy` (`#1E2A3A`)
- Nav item: `text-gray-300 hover:bg-white/10 hover:text-white`, `px-3 py-2.5 rounded-md`
- Active nav item: `bg-white/15 text-white font-medium`, with `3px` left accent bar in `boronia-coral`
- Logo area: top of sidebar, `p-4`, Boronia Consulting wordmark or icon
- Collapse toggle: bottom of sidebar, chevron icon

---

## 9. Excel Import Wizard UX

### Overall Flow (from best practices across Jira CSV import + Asana + SafetyCulture)

**4-step wizard with a horizontal stepper:**

```
[ 1. Upload ] --- [ 2. Map Columns ] --- [ 3. Validate ] --- [ 4. Import ]
```

- Stepper design: circles with step numbers, connected by lines
- Active step: `bg-boronia-coral text-white`
- Completed step: `bg-green-500 text-white` with check icon
- Upcoming step: `bg-gray-200 text-gray-500`
- Footer: `[Back]` and `[Next]` buttons, right-aligned, sticky at bottom of wizard panel

### Step 1: Upload

- **Drop zone**: large (300px tall), dashed border `2px dashed #CBD5E1`, rounded-xl
- Content: upload icon (48px), "Drag & drop your Excel file here" (16px/500), "or" (12px/400), `[Browse Files]` button
- Accepted formats: `.xlsx`, `.xls`, `.csv` — show accepted formats below the drop zone
- On file drop: show file name, size, and a green check, then auto-advance to Step 2 after 500ms
- Error state: if wrong file type, border turns red, show error message below
- **Sheet selector**: if workbook has multiple sheets, show a dropdown to select which sheet to import

### Step 2: Map Columns

- **Split layout**: left side shows source columns from the Excel file, right side shows target fields in CloseOut
- **Each mapping row**:
  ```
  [Excel Column Name v]  --->  [CloseOut Field v]  [Auto-mapped badge / Manual]
  ```
- **Auto-mapping**: system attempts to match column names automatically (fuzzy match on common names like "Title", "Description", "Due Date", "Status", "Assigned To", "Risk", "Department", "Location")
- Auto-mapped fields show a `Matched` badge in green
- Unmatched fields show `Not mapped` in amber — user selects from dropdown
- **Preview**: show first 3 rows of source data below each column mapping for context
- **Required fields indicator**: red asterisk on mandatory target fields (Title is the only mandatory field)
- `[Skip this column]` option in the target dropdown for irrelevant source columns

### Step 3: Validate

- **Preview table**: show all rows to be imported in a data grid
- Columns: row number, mapped fields, validation status
- **Validation rules**:
  - Title: required, non-empty
  - Due Date: valid date format (show what format was detected)
  - Status: must match one of the allowed statuses (suggest closest match for unknowns)
  - Risk Level: must match (Critical, High, Medium, Low) — case insensitive
  - Assignee: attempt to match to existing users, flag unknowns
- **Row colouring**:
  - Valid rows: white background
  - Rows with warnings (fixable): `bg-amber-50`, amber warning icon
  - Rows with errors (will be skipped): `bg-red-50`, red error icon
- **Summary bar** at top: `142 valid | 8 warnings | 3 errors`
- **Inline correction**: user can click on any cell in the preview to fix values before import
- **Error detail**: clicking the error icon shows what went wrong ("Invalid date format: '2026/31/12' — expected DD/MM/YYYY or YYYY-MM-DD")

### Step 4: Import

- **Confirmation screen**: "Ready to import {n} items?"
- Show breakdown: items by status, items by risk level
- `[Import]` button in coral, prominent
- **Progress bar**: during import, show a progress bar with percentage and count (`Importing 42 / 142...`)
- **Completion**: show success summary with counts
  - `142 items imported successfully`
  - `3 items skipped due to errors`
  - `[View in Register]` button to navigate to the grid view
  - `[Download Error Log]` link if any items were skipped

---

## General UI Principles

### Interaction Patterns

- **No modals for editing** — use slide-over panels (detail panel) and inline editing (grid)
- **Modals only for** destructive confirmations (delete), bulk actions confirmation, and the import wizard
- **Keyboard shortcuts** (Linear-inspired, implement progressively):
  - `Cmd+K` — command palette (future)
  - `N` — new item (when not in a text field)
  - `Esc` — close panel / deselect
  - `/` — focus search bar
  - `1-5` — switch views (Dashboard, Register, etc.)
- **Loading states**: skeleton screens (pulsing grey blocks), never spinners for page content
- **Empty states**: illustration-free, text-based: "No items match your filters" with a `[Clear Filters]` button, or "No items yet" with `[Import from Excel]` and `[Create Item]` buttons
- **Toast notifications**: bottom-right, auto-dismiss 3s for success, persistent for errors, max 3 stacked

### Responsive Behaviour

- **Breakpoints**: sm=640px, md=768px, lg=1024px, xl=1280px
- Sidebar: hidden on mobile, toggleable overlay; collapsed (icon-only) on tablet; full on desktop
- Kanban: horizontal scroll on tablet, single-column stack on mobile
- Grid: horizontal scroll with frozen ID + Title columns on mobile/tablet
- Dashboard: 4-col -> 2-col -> 1-col grid

### Accessibility

- All interactive elements must have `focus-visible` ring: `ring-2 ring-boronia-coral ring-offset-2`
- Colour is never the only indicator — always pair with icons, text labels, or patterns
- Minimum touch target: `44px x 44px` on mobile
- All status dots must have `aria-label` with the status name
- Data grid: proper `role="grid"`, `role="row"`, `role="gridcell"` attributes
- Kanban: announce drag-and-drop state changes via `aria-live` region

### Performance

- Virtual scrolling for any list > 50 items
- Debounce search/filter inputs at 300ms
- Memoize card and row components with `React.memo`
- Lazy-load chart components with `React.lazy` + `Suspense`
- IndexedDB queries via Dexie should use indexed fields (status, assignee, dueDate, riskLevel)

---

## Component Directory Mapping

| Section | Component Directory | Key Files |
|---|---|---|
| Sidebar + Layout | `src/components/layout/` | `Sidebar.jsx`, `AppLayout.jsx`, `PageHeader.jsx` |
| Dashboard | `src/components/dashboard/` | `DashboardPage.jsx`, `KpiCard.jsx`, `StatusBar.jsx`, `TrendChart.jsx` |
| Kanban | `src/components/kanban/` | `KanbanBoard.jsx`, `KanbanColumn.jsx`, `KanbanCard.jsx` |
| Data Grid | `src/components/grid/` | `ItemGrid.jsx`, `GridToolbar.jsx`, `BulkActionBar.jsx`, `ColumnChooser.jsx` |
| Detail Panel | `src/components/detail/` | `ItemDetailPanel.jsx`, `DetailHeader.jsx`, `RiskSection.jsx`, `ActivityFeed.jsx` |
| Heat Map | `src/components/heatmap/` | `RiskMatrix.jsx`, `MatrixCell.jsx`, `MatrixTooltip.jsx` |
| Charts | `src/components/charts/` | `SparkChart.jsx`, `DonutChart.jsx`, `TrendLineChart.jsx`, `StackedBarChart.jsx` |
| Excel Import | `src/components/excel/` | `ImportWizard.jsx`, `UploadStep.jsx`, `MappingStep.jsx`, `ValidateStep.jsx`, `ImportStep.jsx` |
| Filter Bar | `src/components/ui/` | `FilterBar.jsx`, `FilterChip.jsx`, `SearchInput.jsx`, `FilterDropdown.jsx` |
| Shared UI | `src/components/ui/` | `StatusDot.jsx`, `RiskBadge.jsx`, `Avatar.jsx`, `Toast.jsx`, `Modal.jsx`, `DatePicker.jsx` |
| Onboarding | `src/components/onboarding/` | `WelcomeScreen.jsx`, `QuickStartGuide.jsx` |
| Reports | `src/components/reports/` | `ReportsPage.jsx`, `ExportPdf.jsx` |
| Settings | `src/components/settings/` | `SettingsPage.jsx`, `UserManagement.jsx` |
| Views | `src/components/views/` | `ByPersonView.jsx`, `ByDepartmentView.jsx`, `ByLocationView.jsx` |
| Store | `src/store/` | `useItemStore.js`, `useFilterStore.js`, `useUiStore.js` |
| Database | `src/db/` | `db.js` (Dexie schema), `seed.js` (demo data) |
| Utilities | `src/utils/` | `statusMachine.js`, `riskCalculator.js`, `excelParser.js`, `formatters.js` |

---

*This document is the single source of truth for all UI implementation. When in doubt, reference the patterns above. Deviate only with documented justification.*
