---
Task ID: 1
Agent: main
Task: Modify schedule weekly view to cut time rows in half with offset card positioning

Work Log:
- Read current schedules-view.tsx to understand the ScheduleGrid component structure
- Replaced flex-based row layout with absolute-positioned grid for precise card placement
- Added half-hour grid constants (FIRST_HOUR=7, LAST_HOUR=21, HOUR_HEIGHT=48px, HALF_HOUR_PX=24px)
- Added timeToY() helper to convert HH:MM 24h time to pixel Y offset
- Added formatHourLabel() for 12h display format
- Time labels positioned at the center of each hour (between top and bottom halves)
- Horizontal grid lines: solid at full hours, dashed at half hours
- Schedule cards positioned with +HALF_HOUR_PX offset for bottom-half start and top-half end
- Added compact prop to ClassCard for short cards with reduced padding
- Lint passes, dev server compiles successfully

Stage Summary:
- Schedule grid now uses half-hour granularity with visual offset
- Cards start at bottom half of start hour and end at top half of end hour
- Each hour row is 48px tall, making the grid more compact
- Compact card variant for short duration classes
