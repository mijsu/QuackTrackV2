import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'

function formatTime12(time: string): string {
  const parts = time.split(':')
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${period}`
}

function esc(s: string): string {
  return (s || '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
}

// Colors
const C = {
  emerald: '#059669',
  emeraldLight: '#10B981',
  sky: '#0EA5E9',
  amber: '#F59E0B',
  dark: '#0F172A',
  gray: '#64748B',
  grayLight: '#94A3B8',
  grayLighter: '#CBD5E1',
  grayBg: '#F8FAFC',
  border: '#E2E8F0',
  white: '#FFFFFF',
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'lab': return C.sky
    case 'lecture_and_lab': return C.amber
    default: return C.emeraldLight
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'lab': return 'LAB'
    case 'lecture_and_lab': return 'LEC+LAB'
    default: return 'LEC'
  }
}

// Text helper that prevents auto page-break by using lineBreak: false
function text(doc: PDFKit.PDFDocument, text: string, x: number, y: number, opts?: PDFKit.Mixins.TextOptions) {
  return doc.text(text, x, y, { ...opts, lineBreak: false })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const facultyId = searchParams.get('facultyId')
    const scheduleVersionId = searchParams.get('scheduleVersionId')

    if (!facultyId || !scheduleVersionId) {
      return NextResponse.json(
        { error: 'facultyId and scheduleVersionId are required' },
        { status: 400 }
      )
    }

    const faculty = await db.user.findUnique({
      where: { id: facultyId },
      include: { department: true },
    })

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    const version = await db.scheduleVersion.findUnique({
      where: { id: scheduleVersionId },
    })

    const schedules = await db.schedule.findMany({
      where: { facultyId, scheduleVersionId },
      include: { subject: true, section: { include: { program: true } } },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })

    // Merge consecutive slots for the same subject+section (matching web UI behavior)
    const mergedSchedules: Array<{
      day: string
      startTime: string
      endTime: string
      subject: typeof schedules[0]['subject']
      section: typeof schedules[0]['section']
    }> = []
    const mergeGroups = new Map<string, typeof schedules>()
    for (const s of schedules) {
      const key = `${s.day}|${s.subjectId}|${s.sectionId}`
      const arr = mergeGroups.get(key) || []
      arr.push(s)
      mergeGroups.set(key, arr)
    }
    for (const [, items] of mergeGroups) {
      items.sort((a, b) => a.startTime.localeCompare(b.startTime))
      let i = 0
      while (i < items.length) {
        let mergedEnd = items[i].endTime
        let j = i + 1
        while (j < items.length && items[j].startTime === mergedEnd) {
          mergedEnd = items[j].endTime
          j++
        }
        mergedSchedules.push({
          day: items[i].day,
          startTime: items[i].startTime,
          endTime: mergedEnd,
          subject: items[i].subject,
          section: items[i].section,
        })
        i = j
      }
    }

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayLabels: Record<string, string> = {
      Mon: 'MONDAY', Tue: 'TUESDAY', Wed: 'WEDNESDAY',
      Thu: 'THURSDAY', Fri: 'FRIDAY', Sat: 'SATURDAY',
    }

    const byDay: Record<string, typeof mergedSchedules> = {}
    for (const day of DAYS) {
      byDay[day] = mergedSchedules.filter(s => s.day === day)
    }

    const totalUnits = mergedSchedules.reduce((sum, s) => sum + (s.subject?.units || 0), 0)
    const totalHours = mergedSchedules.reduce((sum, s) => {
      const sp = s.startTime.split(':'), ep = s.endTime.split(':')
      const sh = parseInt(sp[0], 10), sm = parseInt(sp[1], 10)
      const eh = parseInt(ep[0], 10), em = parseInt(ep[1], 10)
      return sum + ((eh + em / 60) - (sh + sm / 60))
    }, 0)

    const semesterLabel = version?.semester === '1st' ? '1st Semester'
      : version?.semester === '2nd' ? '2nd Semester'
      : version?.semester === '3rd' ? '3rd Semester'
      : version?.semester === 'summer' ? 'Summer'
      : version?.semester || ''

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    // ─── Create PDF ──────────────────────────────────────────────────────
    // A4 landscape: 841.89 x 595.28 points
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      autoFirstPage: true,
    })

    const pageW = doc.page.width  // ~842
    const pageH = doc.page.height // ~595
    const mL = 40   // left margin
    const mR = 40   // right margin
    const cW = pageW - mL - mR // content width

    // ── Top accent bar ──
    doc.rect(0, 0, pageW, 3).fill(C.emerald)

    // ── Header section ──
    let y = 12

    // School name
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.emerald)
    text(doc, 'PATEROS TECHNOLOGICAL COLLEGE', mL, y, { characterSpacing: 2 })

    y = 24
    // Accent line
    doc.rect(mL, y, 28, 2).fill(C.emeraldLight)
    y += 7

    // Title
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.dark)
    text(doc, 'Faculty Class Schedule', mL, y)
    y += 20

    // Subtitle
    doc.font('Helvetica').fontSize(9).fillColor(C.gray)
    text(doc, 'Weekly Teaching Load Report', mL, y)

    // Faculty info (right side)
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.dark)
    text(doc, esc(faculty.name), mL, 24, { width: cW, align: 'right' })

    doc.font('Helvetica').fontSize(8.5).fillColor(C.gray)
    text(doc, `${esc(faculty.department?.name || 'No Department')} · ${esc(faculty.uid)}`, mL, 40, { width: cW, align: 'right' })

    if (faculty.specialization) {
      const spec = faculty.specialization.replace(/[\[\]"]/g, '').replace(/,/g, ' · ')
      if (spec.trim()) {
        doc.font('Helvetica').fontSize(7.5).fillColor(C.grayLight)
        text(doc, esc(spec), mL, 51, { width: cW, align: 'right' })
      }
    }

    y = 58

    // ── Meta bar ──
    const metaH = 22
    doc.roundedRect(mL, y, cW, metaH, 3).fill(C.grayBg)
    doc.roundedRect(mL, y, cW, metaH, 3).strokeColor(C.border).lineWidth(0.5).stroke()

    const metaItems = [
      { label: 'SEMESTER', value: semesterLabel, color: C.dark },
      { label: 'A.Y.', value: esc(version?.academicYear || '—'), color: C.dark },
      { label: 'UNITS', value: String(totalUnits), color: C.emerald },
      { label: 'HOURS', value: totalHours.toFixed(1), color: C.emerald },
      { label: 'CLASSES', value: String(schedules.length), color: C.dark },
    ]

    let mx = mL + 10
    const my = y + 5
    for (const item of metaItems) {
      doc.font('Helvetica-Bold').fontSize(5.5).fillColor(C.grayLight)
      text(doc, item.label, mx, my)
      doc.font('Helvetica-Bold').fontSize(8).fillColor(item.color)
      text(doc, item.value, mx, my + 7)
      const valW = doc.widthOfString(item.value, { fontSize: 8 })
      mx += valW + 24
      if (item !== metaItems[metaItems.length - 1]) {
        doc.rect(mx - 12, my + 1, 0.5, 13).fill(C.border)
      }
    }

    // Legend
    const legendItems = [
      { color: C.emeraldLight, label: 'Lecture' },
      { color: C.sky, label: 'Laboratory' },
      { color: C.amber, label: 'Lec & Lab' },
    ]
    let lx = pageW - mR - 8
    for (let i = legendItems.length - 1; i >= 0; i--) {
      const l = legendItems[i]
      const lw = doc.widthOfString(l.label, { fontSize: 7, font: 'Helvetica' })
      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
      text(doc, l.label, lx - lw, my + 4)
      lx -= lw + 4
      doc.circle(lx, my + 7, 3).fill(l.color)
      lx -= 13
    }

    y += metaH + 8

    // ── Schedule grid ──
    const colGap = 5
    const numCols = DAYS.length
    const colW = (cW - (numCols - 1) * colGap) / numCols
    const dayHdrH = 20
    const cardH = 64  // height per class card

    // Calculate the maximum body height across all days
    let maxBodyH = 0
    for (const day of DAYS) {
      const n = byDay[day].length
      const bodyH = n === 0 ? 30 : n * cardH
      if (bodyH > maxBodyH) maxBodyH = bodyH
    }

    // Check if grid fits on the current page
    const gridH = dayHdrH + maxBodyH
    const footerSpace = 20
    const availableH = pageH - y - footerSpace

    // If grid doesn't fit, reduce card height proportionally (never below 34pt)
    const effectiveCardH = gridH > availableH
      ? Math.max(34, Math.floor((availableH - dayHdrH) / Math.max(1, Math.max(...DAYS.map(d => byDay[d].length)))))
      : cardH

    for (let di = 0; di < DAYS.length; di++) {
      const day = DAYS[di]
      const daySchedules = byDay[day]
      const isEmpty = daySchedules.length === 0
      const colX = mL + di * (colW + colGap)

      // Day header background
      const hdrColor = isEmpty ? C.grayLight : C.emerald
      doc.rect(colX, y, colW, dayHdrH).fill(hdrColor)

      // Rounded top corners
      doc.save()
      doc.roundedRect(colX, y, colW, dayHdrH, 3).fill(hdrColor)
      doc.restore()

      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
      text(doc, dayLabels[day], colX, y + 2, { width: colW, align: 'center' })
      doc.font('Helvetica').fontSize(6).fillColor(C.white)
      text(doc, `${daySchedules.length} ${daySchedules.length === 1 ? 'class' : 'classes'}`, colX, y + 12, { width: colW, align: 'center' })

      // Day body
      let by = y + dayHdrH + 2

      if (isEmpty) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.grayLighter)
        text(doc, 'No classes', colX, by + 12, { width: colW, align: 'center' })
      } else {
        for (let si = 0; si < daySchedules.length; si++) {
          const s = daySchedules[si]
          const typeColor = getTypeColor(s.subject?.subjectType || 'lecture')
          const typeLabel = getTypeLabel(s.subject?.subjectType || 'lecture')

          // Left color accent bar
          doc.rect(colX + 2, by, 3, effectiveCardH - 4).fill(typeColor)

          const tx = colX + 9
          const tw = colW - 13
          const scale = effectiveCardH / 64 // scale factor if cards are compressed

          // Helper to render single-line card text without width-based wrapping
          // (pdfkit's lineBreak:false doesn't prevent wrapping when width is set)
          function cardText(text, x, y, maxW) {
            let displayText = esc(text)
            if (maxW > 0 && doc.widthOfString(displayText) > maxW) {
              while (doc.widthOfString(displayText + '..') > maxW && displayText.length > 0) {
                displayText = displayText.slice(0, -1)
              }
              displayText += '..'
            }
            doc.text(displayText, x, y, { lineBreak: false })
          }

          // Time
          doc.font('Helvetica').fontSize(Math.max(5.5, 7.5 * scale)).fillColor(C.gray)
          cardText(`${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`, tx, by + 3, tw)

          // Subject code
          doc.font('Helvetica-Bold').fontSize(Math.max(6.5, 9 * scale)).fillColor(C.dark)
          cardText(s.subject?.subjectCode || '—', tx, by + 3 + 14 * scale, tw)

          // Subject name
          doc.font('Helvetica').fontSize(Math.max(5.5, 7.5 * scale)).fillColor(C.gray)
          cardText(s.subject?.subjectName || '—', tx, by + 3 + 26 * scale, tw)

          // Section (12pt gap from subject name baseline prevents ™ descender overlap)
          doc.font('Helvetica').fontSize(Math.max(5, 7 * scale)).fillColor(C.grayLight)
          cardText(s.section?.sectionName || '—', tx, by + 3 + 38 * scale, tw)

          // Type label
          doc.font('Helvetica-Bold').fontSize(Math.max(4.5, 6.5 * scale)).fillColor(typeColor)
          cardText(typeLabel, tx, by + 3 + 50 * scale, tw)

          // Separator
          if (si < daySchedules.length - 1) {
            doc.moveTo(colX + 8, by + effectiveCardH - 2)
              .lineTo(colX + colW - 4, by + effectiveCardH - 2)
              .strokeColor('#F1F5F9').lineWidth(0.5).stroke()
          }

          by += effectiveCardH
        }
      }

      // Column border
      const colHeight = Math.max(by - y, dayHdrH + 30)
      doc.roundedRect(colX, y, colW, colHeight, 3)
        .strokeColor(C.border).lineWidth(0.5).stroke()
    }

    // ── Footer ──
    const fy = pageH - 18
    doc.moveTo(mL, fy - 2).lineTo(pageW - mR, fy - 2)
      .strokeColor('#F1F5F9').lineWidth(0.5).stroke()

    doc.font('Helvetica').fontSize(6.5).fillColor(C.grayLighter)
    text(doc, 'QuackTrack · Pateros Technological College', mL, fy)
    doc.font('Helvetica').fontSize(6.5).fillColor(C.grayLighter)
    text(doc, `Generated ${generatedDate}`, mL, fy, { width: cW, align: 'right' })

    // Bottom accent bar
    doc.rect(0, pageH - 2, pageW, 2).fill(C.emeraldLight)

    // ── Finalize PDF buffer ──
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', resolve)
      doc.on('error', reject)
      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    // Sanitize filename
    const safeName = faculty.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const filename = `Schedule_${safeName}_${semesterLabel.replace(/\s/g, '_')}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
