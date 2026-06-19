/*
 * UTH Daily Check Frontend Patch v11
 * Export method: fixed-coordinate Canvas Report -> PDF
 * ใช้วิธีวาดรายงานใหม่ทั้งหน้าเป็น Canvas ด้วยพิกัดตายตัว
 * เพื่อแก้ปัญหา HTML table / browser print / html2canvas ทำให้เส้นและกล่องเบี้ยว
 */

(function () {
  "use strict";

  const A4W = 3508;  // A4 landscape @ ~300dpi ratio
  const A4H = 2480;
  const PDF_W = 297;
  const PDF_H = 210;
  const PURPLE = "#8a1b7a";
  const BLACK = "#111111";
  const LIGHT_BLUE = "#dbe8f6";
  const LIGHT_GRAY = "#e6e6e6";
  const MID_GRAY = "#bfbfbf";

  function cfg() {
    return window.DAILY_CHECK_CONFIG || {};
  }

  function safeText(v) {
    return String(v == null ? "" : v);
  }

  function sanitizeFilePart(v) {
    return safeText(v || "ไม่ระบุ")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "_")
      .slice(0, 80);
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }


  const TH_MONTH_FULL = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function parseDateLike(value) {
    const s = safeText(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(5, 7));
      const d = Number(s.slice(8, 10));
      return { y: y, m: m, d: d };
    }

    const dObj = s ? new Date(s) : new Date();
    if (!isNaN(dObj.getTime())) {
      return { y: dObj.getFullYear(), m: dObj.getMonth() + 1, d: dObj.getDate() };
    }

    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }

  function formatDateBE(value) {
    const d = parseDateLike(value);
    return pad2(d.d) + "-" + pad2(d.m) + "-" + String(d.y + 543);
  }

  function thaiMonthYear(month, yearAD) {
    const m = Number(month) || (new Date().getMonth() + 1);
    const y = Number(yearAD) || new Date().getFullYear();
    return "เดือน" + (TH_MONTH_FULL[m - 1] || String(m)) + " พ.ศ. " + String(y + 543);
  }

  function getSelectedDepartment() {
    const fDept = document.getElementById("filter-dept");
    if (fDept && fDept.value && fDept.value !== "ALL") return fDept.value;
    return "ทุกแผนก";
  }


  function shortEquip(equip) {
    try {
      if (typeof window.equipmentShort === "function") return window.equipmentShort(equip);
    } catch (e) {}
    return safeText(equip || "Medical_Device").split(" (")[0].trim() || "Medical_Device";
  }

  function isNormalStatus(status) {
    const s = safeText(status).toUpperCase();
    return s.includes("PASS") || s.includes("ปกติ") || s.includes("พร้อม");
  }

  function getMeta(equipment) {
    const map = window.UTH_DOCUMENT_META || {};
    return map[equipment] || map.DEFAULT || {
      short: shortEquip(equipment),
      title: "ใบรายงานการตรวจเช็คเครื่องมือแพทย์",
      docNo: "UTH-CME-DC-GEN",
      revision: "00"
    };
  }

  function rowEquip(row) {
    return row && (row.equip || row.equipment || row.type || "");
  }

  function rowDept(row) {
    return row && (row.dept || row.department || "");
  }

  function rowSN(row) {
    return row && (row.sn || row.idCode || row.id || "");
  }

  function rowDate(row) {
    return row && (row.checkDate || row.date || "");
  }

  function rowInspector(row) {
    return row && (row.inspector || row.checkedBy || "");
  }

  function getChecklistSource(equipment) {
    try {
      if (typeof window.DYNAMIC_CHECKLISTS !== "undefined") {
        return window.DYNAMIC_CHECKLISTS[equipment] || window.DYNAMIC_CHECKLISTS.DEFAULT || [];
      }
    } catch (e) {}
    return [];
  }

  function parseChecklistText(text, equipment) {
    const rows = [];
    const raw = safeText(text).trim();

    if (raw) {
      raw.split(/\n+/).forEach(function (line, idx) {
        let clean = line.replace(/^[-•]\s*/, "").trim();
        let result = "";

        const m = clean.match(/^\[(PASS|FAIL|P|F)\]\s*(.*)$/i);
        if (m) {
          result = (/FAIL|F/i).test(m[1]) ? "FAIL" : "PASS";
          clean = m[2].trim();
        }

        clean = clean.replace(/^\d+\.\s*/, "");
        rows.push({ no: idx + 1, text: clean, result: result });
      });
      return rows;
    }

    let no = 0;
    getChecklistSource(equipment).forEach(function (item) {
      if (item.section) rows.push({ section: item.section });
      else {
        no += 1;
        rows.push({ no: item.no || no, text: item.text || "", result: "" });
      }
    });

    return rows;
  }

  function setFont(ctx, size, weight) {
    ctx.font = `${weight || 400} ${size}px Sarabun, "TH Sarabun New", Tahoma, Arial, sans-serif`;
    ctx.fillStyle = BLACK;
    ctx.textBaseline = "top";
  }

  function line(ctx, x1, y1, x2, y2, width) {
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = width || 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function rect(ctx, x, y, w, h, opts) {
    opts = opts || {};
    ctx.save();
    ctx.lineWidth = opts.width || 2;
    ctx.strokeStyle = opts.stroke || BLACK;
    if (opts.fill) {
      ctx.fillStyle = opts.fill;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
    ctx.restore();
  }

  function fillRect(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function dottedLine(ctx, x1, y, x2) {
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(Math.round(x1), Math.round(y));
    ctx.lineTo(Math.round(x2), Math.round(y));
    ctx.stroke();
    ctx.restore();
  }

  function centerText(ctx, text, x, y, w, size, weight) {
    setFont(ctx, size, weight || 700);
    ctx.textAlign = "center";
    ctx.fillText(safeText(text), x + w / 2, y);
    ctx.textAlign = "left";
  }

  function rightText(ctx, text, x, y, w, size, weight) {
    setFont(ctx, size, weight || 400);
    ctx.textAlign = "right";
    ctx.fillText(safeText(text), x + w, y);
    ctx.textAlign = "left";
  }

  function wrapText(ctx, text, x, y, maxW, lineH, maxLines, size, weight) {
    setFont(ctx, size, weight || 400);
    ctx.textAlign = "left";
    const raw = safeText(text).replace(/\s+/g, " ").trim();
    if (!raw) return 0;

    const words = raw.split(" ");
    const lines = [];
    let current = "";

    words.forEach(function (word) {
      const candidate = current ? current + " " + word : word;
      if (ctx.measureText(candidate).width <= maxW) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);

    const limited = lines.slice(0, maxLines || lines.length);
    limited.forEach(function (l, i) {
      let out = l;
      if (i === limited.length - 1 && lines.length > limited.length) out = out.replace(/.{3}$/, "...");

      // If a single long token still overflows, scale text horizontally only for that line.
      const mw = ctx.measureText(out).width;
      if (mw > maxW) {
        ctx.save();
        ctx.translate(x, y + i * lineH);
        ctx.scale(maxW / mw, 1);
        ctx.fillText(out, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(out, x, y + i * lineH);
      }
    });
    return limited.length * lineH;
  }

  let logoCachePromise = null;
  function loadLogo() {
    if (logoCachePromise) return logoCachePromise;

    logoCachePromise = new Promise(function (resolve) {
      const url = (cfg().LOGO_URL || "").trim();
      if (!url) return resolve(null);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });

    return logoCachePromise;
  }

  async function drawLogoHeader(ctx, meta, subTitle) {
    const logo = await loadLogo();
    const centerX = A4W / 2;

    if (logo) {
      const size = 115;
      ctx.drawImage(logo, centerX - size / 2, 105, size, size);
    }

    centerText(ctx, cfg().HOSPITAL_NAME || "โรงพยาบาลอุทัยธานี", centerX - 600, 238, 1200, 34, 900);
    centerText(ctx, meta.title || "ใบรายงานการตรวจเช็คเครื่องมือแพทย์", centerX - 1000, 285, 2000, 30, 800);
    if (subTitle) centerText(ctx, subTitle, centerX - 1000, 337, 2000, 30, 800);
  }

  function drawInfoGrid(ctx, row, meta, y) {
    const left = 115;
    const tableW = A4W - 230;
    const rowH = 58;

    function field(label, value, x, yy, w, labelW) {
      labelW = labelW || 175;
      setFont(ctx, 25, 900);
      ctx.fillText(label, x, yy + 6);
      dottedLine(ctx, x + labelW, yy + 39, x + w);
      wrapText(ctx, value || "", x + labelW + 10, yy + 4, w - labelW - 15, 26, 1, 24, 600);
    }

    // รายงานรายเครื่อง: แผนก / วันที่ตรวจ / หมายเลขครุภัณฑ์ / ID Code / SN เท่านั้น
    // เอา ยี่ห้อ / รุ่น ออกตาม request
    const topLeftW = 2140;
    const topRightW = tableW - topLeftW - 70;
    field("แผนก", rowDept(row) || "ทุกแผนก", left, y, topLeftW, 110);
    field("วันที่ตรวจ", rowDate(row), left + topLeftW + 70, y, topRightW, 160);

    const colGap = 70;
    const colW = (tableW - colGap * 2) / 3;
    const y2 = y + rowH;
    field("หมายเลขครุภัณฑ์", row.assetNo || "", left, y2, colW, 250);
    field("ID Code", row.deviceIdCode || row.idCode || "", left + colW + colGap, y2, colW, 135);
    field("SN", row.sn || rowSN(row), left + (colW + colGap) * 2, y2, colW, 70);

    return y + rowH * 2 + 18;
  }

  function drawDailyTable(ctx, rows, y) {
    const x = 115;
    const tableW = A4W - 230;
    const noW = 58;
    const passW = 92;
    const failW = 92;
    const noteW = 265;
    const itemW = tableW - noW - passW - failW - noteW;
    const headerH = 46;

    const normalRows = rows.filter(r => !r.section).length || 1;
    const sectionRows = rows.filter(r => r.section).length;
    const maxBottom = 1690;
    let itemH = Math.floor((maxBottom - y - headerH - sectionRows * 42) / normalRows);
    itemH = Math.max(42, Math.min(64, itemH));
    const sectionH = 42;

    rect(ctx, x, y, tableW, headerH, { fill: LIGHT_GRAY, width: 2 });
    centerText(ctx, "No.", x, y + 12, noW, 21, 900);
    centerText(ctx, "รายการตรวจสอบ", x + noW, y + 12, itemW, 21, 900);
    centerText(ctx, "PASS", x + noW + itemW, y + 12, passW, 21, 900);
    centerText(ctx, "FAIL", x + noW + itemW + passW, y + 12, failW, 21, 900);
    centerText(ctx, "หมายเหตุ", x + noW + itemW + passW + failW, y + 12, noteW, 21, 900);

    // Vertical header lines
    line(ctx, x + noW, y, x + noW, y + headerH, 2);
    line(ctx, x + noW + itemW, y, x + noW + itemW, y + headerH, 2);
    line(ctx, x + noW + itemW + passW, y, x + noW + itemW + passW, y + headerH, 2);
    line(ctx, x + noW + itemW + passW + failW, y, x + noW + itemW + passW + failW, y + headerH, 2);

    let yy = y + headerH;

    rows.forEach(function (r) {
      if (r.section) {
        rect(ctx, x, yy, tableW, sectionH, { fill: MID_GRAY, width: 2 });
        setFont(ctx, 22, 900);
        ctx.fillText(safeText(r.section), x + noW + 12, yy + 10);
        yy += sectionH;
        return;
      }

      rect(ctx, x, yy, tableW, itemH, { width: 2 });
      line(ctx, x + noW, yy, x + noW, yy + itemH, 2);
      line(ctx, x + noW + itemW, yy, x + noW + itemW, yy + itemH, 2);
      line(ctx, x + noW + itemW + passW, yy, x + noW + itemW + passW, yy + itemH, 2);
      line(ctx, x + noW + itemW + passW + failW, yy, x + noW + itemW + passW + failW, yy + itemH, 2);

      centerText(ctx, r.no || "", x, yy + Math.max(9, itemH / 2 - 12), noW, 22, 700);
      wrapText(ctx, r.text || "", x + noW + 14, yy + 9, itemW - 24, 24, Math.max(1, Math.floor((itemH - 10) / 24)), 22, 500);

      const passX = x + noW + itemW;
      const failX = passX + passW;
      const checkY = yy + itemH / 2 - 17;
      const box = 34;

      rect(ctx, passX + passW / 2 - box / 2, checkY, box, box, { width: 2 });
      rect(ctx, failX + failW / 2 - box / 2, checkY, box, box, { width: 2 });

      setFont(ctx, 31, 900);
      ctx.textAlign = "center";
      if (safeText(r.result).toUpperCase() === "PASS") ctx.fillText("✓", passX + passW / 2, checkY - 2);
      if (safeText(r.result).toUpperCase() === "FAIL") ctx.fillText("✕", failX + failW / 2, checkY - 2);
      ctx.textAlign = "left";

      yy += itemH;
    });

    return yy;
  }

  function drawSignatureAndFooter(ctx, y, inspector, meta) {
    const x = 115;
    const tableW = A4W - 230;
    const gap = 50;
    const boxW = (tableW - gap) / 2;
    const signH = 165;

    setFont(ctx, 24, 900);
    ctx.fillText("หมายเหตุ / อาการชำรุด :-", x, y + 4);
    dottedLine(ctx, x, y + 58, x + tableW);
    dottedLine(ctx, x, y + 108, x + tableW);

    y += 135;

    rect(ctx, x, y, boxW, signH, { width: 2 });
    rect(ctx, x + boxW + gap, y, boxW, signH, { width: 2 });

    dottedLine(ctx, x + 40, y + 62, x + boxW - 40);
    dottedLine(ctx, x + boxW + gap + 40, y + 62, x + boxW + gap + boxW - 40);

    centerText(ctx, inspector ? "(" + inspector + ")" : "(........................................)", x, y + 82, boxW, 23, 700);
    centerText(ctx, "ผู้ตรวจสอบ", x, y + 113, boxW, 24, 900);

    centerText(ctx, "(........................................)", x + boxW + gap, y + 82, boxW, 23, 700);
    centerText(ctx, "หัวหน้าแผนก", x + boxW + gap, y + 113, boxW, 24, 900);

    y += signH + 22;

    const noteH = 56;
    rect(ctx, x, y, tableW / 2 + 170, noteH, { fill: LIGHT_BLUE, width: 2 });
    rect(ctx, x + tableW / 2 + 170, y, tableW / 2 - 170, noteH, { fill: LIGHT_BLUE, width: 2 });
    centerText(ctx, "หมายเหตุ : ให้ทำเครื่องหมาย ✓ = ปกติ, ✕ = ผิดปกติ, N/A = กรณีไม่มี Function", x, y + 16, tableW / 2 + 170, 18, 500);
    centerText(ctx, "หมายเหตุ : กรณีที่เครื่องไม่ได้ใช้งานให้ตรวจสอบรายสัปดาห์", x + tableW / 2 + 170, y + 16, tableW / 2 - 170, 18, 500);

    // footer fixed position: ไม่ให้ชนกับเนื้อหาด้านบน
    setFont(ctx, 18, 500);
    ctx.fillText("กลุ่มงานโครงสร้างพื้นฐานและวิศวกรรมทางการแพทย์ (ศูนย์เครื่องมือแพทย์) โรงพยาบาลอุทัยธานี", x, A4H - 110);
    rightText(ctx, "เลขที่เอกสาร: " + (meta.docNo || "") + "   Rev. " + (meta.revision || "00"), x, A4H - 110, tableW, 18, 700);
  }

  async function drawDailyCanvas(canvas, row) {
    canvas.width = A4W;
    canvas.height = A4H;
    canvas.className = "uth-canvas-report-page";
    canvas.style.width = "1123px";
    canvas.style.height = "794px";
    canvas.style.background = "#fff";
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    canvas.style.boxSizing = "border-box";

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, A4W, A4H);

    const equipment = rowEquip(row);
    const meta = getMeta(equipment);
    await drawLogoHeader(ctx, meta, "");

    centerText(ctx, (meta.title || "ใบรายงานการตรวจเช็คเครื่องมือแพทย์") + (meta.short ? " (" + meta.short + ")" : ""), 400, 415, A4W - 800, 30, 900);

    let y = drawInfoGrid(ctx, row, meta, 500);
    const checklistRows = parseChecklistText(row && row.checkText, equipment);
    y = drawDailyTable(ctx, checklistRows, y + 8);

    drawSignatureAndFooter(ctx, y + 18, rowInspector(row), meta);
  }

  function getDayFromRow(r) {
    const ds = r.checkDate || r.date || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) return Number(ds.slice(8, 10));
    const m = safeText(r.timestamp || "").match(/^(\d{1,2})\//);
    return m ? Number(m[1]) : 0;
  }

  async function drawMonthlyCanvas(canvas, rows) {
    canvas.width = A4W;
    canvas.height = A4H;
    canvas.className = "uth-canvas-report-page";
    canvas.style.width = "1123px";
    canvas.style.height = "794px";
    canvas.style.background = "#fff";
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    canvas.style.boxSizing = "border-box";

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, A4W, A4H);

    const fMonth = document.getElementById("filter-month");
    const fYear = document.getElementById("filter-year");
    const fEquip = document.getElementById("filter-equip");
    const now = new Date();
    const month = fMonth && fMonth.value !== "ALL" ? Number(fMonth.value) : now.getMonth() + 1;
    const year = fYear && fYear.value !== "ALL" ? Number(fYear.value) : now.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthText = thaiMonthYear(month, year);
    const deptText = getSelectedDepartment();
    const equipment = fEquip && fEquip.value !== "ALL" ? fEquip.value : ((rows[0] && rowEquip(rows[0])) || "");
    const meta = getMeta(equipment);

    await drawLogoHeader(ctx, meta, "ใบสรุปรายงานการตรวจเช็คเครื่องมือแพทย์ประจำเดือน");

    const left = 115;
    const tableW = A4W - 230;
    let y = 475;

    function monthField(label, value, x, yy, w, labelW) {
      setFont(ctx, 25, 900);
      ctx.fillText(label, x, yy);
      dottedLine(ctx, x + labelW, yy + 32, x + w);
      wrapText(ctx, value || "", x + labelW + 10, yy - 1, w - labelW - 15, 26, 1, 24, 600);
    }

    // Monthly: หน่วยงานเต็ม + ตรวจเช็คประจำเดือนภาษาไทยเต็ม
    monthField("หน่วยงาน", deptText || "ทุกแผนก", left, y, left + tableW * 0.54, 135);
    monthField("ตรวจเช็คประจำเดือน", monthText, left + tableW * 0.58, y, left + tableW, 310);

    y += 76;

    // Build groups: รายการเครื่องมือเต็ม eng/th + แยกรหัสเครื่อง/SN ออกมาอีก column
    const groups = {};
    (rows || []).forEach(function (r) {
      const key = [rowEquip(r) || "-", rowSN(r) || "-"].join("|");
      if (!groups[key]) groups[key] = { equip: rowEquip(r) || "-", sn: rowSN(r) || "-", days: {} };
      const day = getDayFromRow(r);
      if (day > 0) groups[key].days[day] = isNormalStatus(r.status) ? "PASS" : "FAIL";
    });

    const groupList = Object.values(groups);
    const noW = 55;
    const itemW = 700;
    const codeW = 300;
    const passW = 74;
    const failW = 74;
    const dayW = (tableW - noW - itemW - codeW - passW - failW) / daysInMonth;
    const headerH = 56;
    const rowH = Math.max(52, Math.min(72, Math.floor((1735 - y - headerH) / Math.max(groupList.length, 1))));

    rect(ctx, left, y, tableW, headerH, { fill: LIGHT_GRAY, width: 2 });
    centerText(ctx, "No.", left, y + 15, noW, 18, 900);
    centerText(ctx, "รายการเครื่องมือ", left + noW, y + 15, itemW, 18, 900);
    centerText(ctx, "รหัสเครื่อง / SN", left + noW + itemW, y + 15, codeW, 18, 900);
    centerText(ctx, "PASS", left + noW + itemW + codeW, y + 15, passW, 18, 900);
    centerText(ctx, "FAIL", left + noW + itemW + codeW + passW, y + 15, failW, 18, 900);

    let x = left + noW + itemW + codeW + passW + failW;
    for (let d = 1; d <= daysInMonth; d++) {
      centerText(ctx, d, x, y + 15, dayW, 16, 900);
      line(ctx, x, y, x, y + headerH, 2);
      x += dayW;
    }

    line(ctx, left + noW, y, left + noW, y + headerH, 2);
    line(ctx, left + noW + itemW, y, left + noW + itemW, y + headerH, 2);
    line(ctx, left + noW + itemW + codeW, y, left + noW + itemW + codeW, y + headerH, 2);
    line(ctx, left + noW + itemW + codeW + passW, y, left + noW + itemW + codeW + passW, y + headerH, 2);
    line(ctx, left + noW + itemW + codeW + passW + failW, y, left + noW + itemW + codeW + passW + failW, y + headerH, 2);

    y += headerH;

    groupList.forEach(function (g, idx) {
      rect(ctx, left, y, tableW, rowH, { width: 2 });
      line(ctx, left + noW, y, left + noW, y + rowH, 2);
      line(ctx, left + noW + itemW, y, left + noW + itemW, y + rowH, 2);
      line(ctx, left + noW + itemW + codeW, y, left + noW + itemW + codeW, y + rowH, 2);
      line(ctx, left + noW + itemW + codeW + passW, y, left + noW + itemW + codeW + passW, y + rowH, 2);
      line(ctx, left + noW + itemW + codeW + passW + failW, y, left + noW + itemW + codeW + passW + failW, y + rowH, 2);

      centerText(ctx, idx + 1, left, y + rowH / 2 - 12, noW, 18, 700);
      wrapText(ctx, g.equip, left + noW + 12, y + 8, itemW - 24, 20, Math.max(1, Math.floor((rowH - 12) / 20)), 17, 700);
      wrapText(ctx, g.sn, left + noW + itemW + 12, y + rowH / 2 - 10, codeW - 24, 20, 1, 17, 600);

      const hasPass = Object.values(g.days).some(v => v === "PASS");
      const hasFail = Object.values(g.days).some(v => v === "FAIL");

      setFont(ctx, 28, 900);
      ctx.textAlign = "center";
      if (hasPass) ctx.fillText("✓", left + noW + itemW + codeW + passW / 2, y + rowH / 2 - 16);
      if (hasFail) ctx.fillText("✕", left + noW + itemW + codeW + passW + failW / 2, y + rowH / 2 - 16);
      ctx.textAlign = "left";

      let dx = left + noW + itemW + codeW + passW + failW;
      for (let d = 1; d <= daysInMonth; d++) {
        line(ctx, dx, y, dx, y + rowH, 2);
        const val = g.days[d];
        setFont(ctx, 28, 900);
        ctx.textAlign = "center";
        if (val === "PASS") ctx.fillText("✓", dx + dayW / 2, y + rowH / 2 - 16);
        if (val === "FAIL") ctx.fillText("✕", dx + dayW / 2, y + rowH / 2 - 16);
        ctx.textAlign = "left";
        dx += dayW;
      }
      y += rowH;
    });

    if (!groupList.length) {
      rect(ctx, left, y, tableW, 130, { width: 2 });
      centerText(ctx, "ไม่พบข้อมูล", left, y + 45, tableW, 30, 700);
      y += 130;
    }

    drawSignatureAndFooter(ctx, y + 18, localStorage.getItem("uth_inspector") || "", meta);
  }

  function ensureCanvasModal() {
    let modal = document.getElementById("pdf-modal");

    if (!modal || modal.dataset.uthCanvasV11 !== "1") {
      if (modal) modal.remove();
      modal = document.createElement("div");
      modal.id = "pdf-modal";
      modal.dataset.uthCanvasV11 = "1";
      modal.style.cssText = "display:none;position:fixed;z-index:9999;inset:0;background:rgba(15,23,42,.72);align-items:flex-start;justify-content:center;overflow:auto;padding:24px;";
      modal.innerHTML = `
        <div class="no-print" style="background:#fff;border-radius:18px;max-width:1280px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 16px;background:#9b1b8f;color:#fff;flex-wrap:wrap">
            <div>
              <h3 style="margin:0;font-weight:900;color:#fff;font-size:1rem">Preview PDF รายงานประจำวัน</h3>
              <div style="font-size:.78rem;opacity:.9">Canvas A4 Report: วาดเส้น/กล่องด้วยพิกัดตายตัว ไม่ใช้ HTML table</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button type="button" style="border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.16);color:#fff;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer" onclick="uthPdfZoomOut()">−</button>
              <span id="uth-pdf-zoom-label" style="min-width:52px;text-align:center;font-weight:900;color:#fff">100%</span>
              <button type="button" style="border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.16);color:#fff;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer" onclick="uthPdfZoomIn()">+</button>
              <button type="button" style="border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.16);color:#fff;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer" onclick="uthPdfZoomReset()">100%</button>
              <button id="btn-download-pdf" type="button" style="border:1px solid #fff;background:#fff;color:#9b1b8f;border-radius:12px;padding:10px 14px;font-weight:900;cursor:pointer" onclick="downloadPdf()">Download PDF</button>
              <button type="button" style="border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.16);color:#fff;border-radius:12px;padding:10px 14px;font-weight:900;cursor:pointer" onclick="closePdfModal()">ปิด</button>
            </div>
          </div>
          <div id="uth-pdf-scroll" style="background:#e8eef7;padding:18px;overflow:auto;max-height:calc(94vh - 76px)">
            <div id="pdf-template" style="display:flex;flex-direction:column;align-items:center;gap:18px;min-width:max-content"></div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    return modal;
  }

  window.closePdfModal = function closePdfModalV11() {
    const modal = document.getElementById("pdf-modal");
    if (modal) modal.style.display = "none";
  };

  
  window._uthPdfZoom = window._uthPdfZoom || 1;

  function applyPdfZoom() {
    const zoom = Math.max(0.4, Math.min(2.2, window._uthPdfZoom || 1));
    window._uthPdfZoom = zoom;
    const label = document.getElementById("uth-pdf-zoom-label");
    if (label) label.textContent = Math.round(zoom * 100) + "%";

    document.querySelectorAll("#pdf-template canvas.uth-canvas-report-page").forEach(function (canvas) {
      canvas.style.width = Math.round(1123 * zoom) + "px";
      canvas.style.height = Math.round(794 * zoom) + "px";
      canvas.style.background = "#fff";
      canvas.style.display = "block";
      canvas.style.margin = "0 auto";
      canvas.style.boxSizing = "border-box";
      canvas.style.border = "1px solid #d7dee8";
      canvas.style.boxShadow = "0 8px 22px rgba(15,23,42,.12)";
    });
  }

  window.uthPdfZoomIn = function () {
    window._uthPdfZoom = Math.min(2.2, (window._uthPdfZoom || 1) + 0.1);
    applyPdfZoom();
  };

  window.uthPdfZoomOut = function () {
    window._uthPdfZoom = Math.max(0.4, (window._uthPdfZoom || 1) - 0.1);
    applyPdfZoom();
  };

  window.uthPdfZoomReset = function () {
    window._uthPdfZoom = 1;
    applyPdfZoom();
  };

  function getReportFileName(rows, mode) {
    const first = rows && rows[0] ? rows[0] : {};
    const dept = mode === "monthly"
      ? getSelectedDepartment()
      : (rowDept(first) || getSelectedDepartment() || "ทุกแผนก");

    const dateSource = mode === "monthly" ? (rowDate(first) || todayISO()) : (rowDate(first) || todayISO());
    const dateBE = formatDateBE(dateSource);

    if (mode === "monthly") {
      return `${sanitizeFilePart(dateBE)}__${sanitizeFilePart(dept)}_ใบสรุปรายงานการตรวจเช็คเครื่องมือแพทย์ประจำเดือน.pdf`;
    }

    const equip = shortEquip(rowEquip(first) || "Medical_Device");
    return `${sanitizeFilePart(dateBE)}_${sanitizeFilePart(dept)}_ใบสรุปรายงานการตรวจเช็คเครื่องมือแพทย์ประจำวัน_${sanitizeFilePart(equip)}.pdf`;
  }

  window.renderPdfTemplate = function renderPdfTemplateV11(rows) {
    const modal = ensureCanvasModal();
    const target = document.getElementById("pdf-template");
    if (!target) return;

    window._uthCurrentReportRows = rows || [];
    window._uthCurrentReportMode = "daily";
    window._uthCanvasRenderPromises = [];
    target.innerHTML = "";

    (rows || []).forEach(function (row, idx) {
      const canvas = document.createElement("canvas");
      target.appendChild(canvas);
      const promise = drawDailyCanvas(canvas, row || {});
      window._uthCanvasRenderPromises.push(promise);
    });

    if (!rows || !rows.length) {
      const canvas = document.createElement("canvas");
      target.appendChild(canvas);
      const promise = drawDailyCanvas(canvas, {});
      window._uthCanvasRenderPromises.push(promise);
    }

    setTimeout(applyPdfZoom, 50);
    return modal;
  };

  window.exportSinglePdf = function exportSinglePdfV11(idx) {
    let row = null;
    try { row = (typeof lastFilteredData !== "undefined" && lastFilteredData[idx]) ? lastFilteredData[idx] : null; } catch (e) { row = null; }
    if (!row) return;
    const modal = window.renderPdfTemplate([row]);
    if (modal) modal.style.display = "flex";
  };

  window.exportAllPdf = function exportAllPdfV11() {
    let rows = [];
    try { rows = typeof lastFilteredData !== "undefined" ? lastFilteredData : []; } catch (e) { rows = []; }
    if (!rows || !rows.length) { alert("ไม่พบข้อมูลสำหรับ Export"); return; }
    const modal = window.renderPdfTemplate(rows);
    if (modal) modal.style.display = "flex";
  };

  window.openMonthlySummary = function openMonthlySummaryV11() {
    let rows = [];
    try { rows = typeof lastFilteredData !== "undefined" ? lastFilteredData : []; } catch (e) { rows = []; }

    const modal = ensureCanvasModal();
    const target = document.getElementById("pdf-template");
    target.innerHTML = "";

    window._uthCurrentReportRows = rows || [];
    window._uthCurrentReportMode = "monthly";

    const canvas = document.createElement("canvas");
    target.appendChild(canvas);
    window._uthCanvasRenderPromises = [drawMonthlyCanvas(canvas, rows || [])];

    modal.style.display = "flex";
    setTimeout(applyPdfZoom, 50);
  };

  window.downloadPdf = async function downloadPdfV11(fileName) {
    const btn = document.getElementById("btn-download-pdf");
    const old = btn ? btn.innerHTML : "";
    if (btn) {
      btn.innerHTML = "กำลังสร้าง PDF...";
      btn.disabled = true;
    }

    try {
      if (window._uthCanvasRenderPromises && window._uthCanvasRenderPromises.length) {
        await Promise.all(window._uthCanvasRenderPromises);
      }

      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("ไม่พบ jsPDF library");
      }

      const canvases = Array.from(document.querySelectorAll("#pdf-template canvas.uth-canvas-report-page"));
      if (!canvases.length) throw new Error("ไม่พบ Canvas Report");

      const pdf = new window.jspdf.jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true
      });

      canvases.forEach(function (canvas, idx) {
        if (idx > 0) pdf.addPage("a4", "landscape");
        const img = canvas.toDataURL("image/png");
        pdf.addImage(img, "PNG", 0, 0, PDF_W, PDF_H, undefined, "FAST");
      });

      const rows = window._uthCurrentReportRows || [];
      const mode = window._uthCurrentReportMode || "daily";
      pdf.save(fileName || getReportFileName(rows, mode));
    } catch (err) {
      alert("สร้าง PDF ไม่สำเร็จ: " + err.message);
    } finally {
      if (btn) {
        btn.innerHTML = old || "Download PDF";
        btn.disabled = false;
      }
    }
  };

  // Remove template buttons from old patches if still present.
  setTimeout(function () {
    const tempBtn = document.getElementById("uth-template-download-label");
    if (tempBtn) tempBtn.remove();
    document.querySelectorAll('button').forEach(function (btn) {
      if (/template/i.test(btn.textContent || "") && btn.id !== "uth-template-upload-label") btn.remove();
    });
  }, 500);
})();


/* ============================================================
 * FINAL UPLOADED FIX OVERRIDES
 * ใช้กับชุดโค้ดที่ user upload เท่านั้น
 * ============================================================ */
(function () {
  "use strict";

  window.closePdfPreview = function closePdfPreviewFinal() {
    if (typeof window.closePdfModal === "function") {
      window.closePdfModal();
      return;
    }
    const modal = document.getElementById("pdf-modal");
    if (modal) modal.style.display = "none";
  };

  window.openPdfPreview = function openPdfPreviewFinal() {
    let rows = [];
    try { rows = typeof lastFilteredData !== "undefined" ? lastFilteredData : []; } catch (e) { rows = []; }
    if (!rows || rows.length === 0) {
      alert("ไม่พบข้อมูลสำหรับ Export PDF กรุณาเลือก Filter หรือโหลด Dashboard ก่อน");
      return;
    }
    const modal = window.renderPdfTemplate(rows);
    const pdfModal = modal || document.getElementById("pdf-modal");
    if (pdfModal) pdfModal.style.display = "flex";
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  };
})();


/* ============================================================
 * FORCE 7 FIELDS FALLBACK
 * ถ้า index.html เก่าไม่แสดง ID CODE ให้ patch นี้แทรกให้ทันที
 * ============================================================ */
(function () {
  "use strict";

  function forceSevenFields() {
    try {
      if (document.getElementById("deviceIdCode")) return;

      const snInput = document.getElementById("idCode");
      const assetInput = document.getElementById("assetNo");
      if (!snInput) return;

      const snBox = snInput.closest(".space-y-2") || snInput.parentElement;
      const assetBox = assetInput ? (assetInput.closest(".space-y-2") || assetInput.parentElement) : null;
      const row = snBox ? snBox.parentElement : null;
      if (!row) return;

      row.className = "grid grid-cols-1 md:grid-cols-3 gap-5";

      const idBox = document.createElement("div");
      idBox.className = "space-y-2 min-w-0";
      idBox.innerHTML = `
        <label class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <i data-lucide="barcode" class="w-4 h-4 text-uth-600"></i> ID CODE <span class="text-xs text-slate-400 font-medium">(ไม่บังคับ)</span>
        </label>
        <input type="text" id="deviceIdCode" placeholder="ID CODE" class="w-full p-3.5 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-uth-500 outline-none uppercase shadow-sm">
      `;

      if (assetBox && assetBox.parentElement === row) {
        row.insertBefore(idBox, assetBox);
      } else if (snBox.nextSibling) {
        row.insertBefore(idBox, snBox.nextSibling);
      } else {
        row.appendChild(idBox);
      }

      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    } catch (e) {
      console.warn("forceSevenFields error", e);
    }
  }

  document.addEventListener("DOMContentLoaded", forceSevenFields);
  setTimeout(forceSevenFields, 200);
  setTimeout(forceSevenFields, 800);
  setTimeout(forceSevenFields, 1500);
})();
