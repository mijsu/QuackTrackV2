---
Task ID: 1
Agent: main
Task: Integrate uploaded schedule-grid-card UI into the SchedulesView weekly grid

Work Log:
- Extracted and examined the uploaded schedule-grid-ui.zip containing a Next.js project with schedule-grid-card.tsx
- Analyzed the uploaded UI: flex-based weekly grid with hourly time slots, class cards with colored left borders by type
- Replaced ScheduleBlock with new ClassCard component matching uploaded UI style
- Replaced CSS Grid layout with flex-based layout matching uploaded UI
- Updated Legend component to match uploaded UI (w-3 h-3 dots, gap-3 spacing)
- Updated mobile MobileView to use ClassCard instead of removed ScheduleBlock
- Added showSection prop to ScheduleGrid for faculty view context
- Removed unused code and imports
- All lint checks pass, dev server running HTTP 200

Stage Summary:
- Weekly schedule grid now matches the uploaded UI design pattern
- Color-coded class types (cyan=lecture, blue=lab, amber=lec&lab)
- Flex-based layout replaces CSS Grid for simpler rendering
- All existing functionality preserved
