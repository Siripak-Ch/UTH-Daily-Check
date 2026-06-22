/*
Daily Check Frontend V2
- GitHub Pages frontend
- Apps Script Web App backend via fetch()
- Adds inspector field, select-all checklist, dashboard filters, PDF preview/export
*/

async function callAppsScript(action, data = null) {
  /*
   * FINAL V5.25
   * - No local-sample data
   * - Always use current APPS_SCRIPT_URL from config.js
   * - Add cache buster to avoid old response caching
   */
  const appsScriptUrl = (window.DAILY_CHECK_CONFIG && window.DAILY_CHECK_CONFIG.APPS_SCRIPT_URL || "").trim();
  if (!appsScriptUrl || appsScriptUrl.includes("PASTE_APPS_SCRIPT")) {
    throw new Error("ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL ใน config.js");
  }

  const cacheBust = "_ts=" + Date.now() + "&_v=V5.25";
  const parseResponse = async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { throw new Error("Apps Script response ไม่ใช่ JSON: " + text.slice(0, 250)); }
  };

  if (["dashboard","getSettings","getSettingsBundle","getUserLoginSettings","getDepartmentSettings","getEquipmentList","getVersion","checkRootFolder"].includes(action)) {
    const url = appsScriptUrl + (appsScriptUrl.includes("?") ? "&" : "?") + "action=" + encodeURIComponent(action) + "&" + cacheBust;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    return await parseResponse(res);
  }

  const res = await fetch(appsScriptUrl + (appsScriptUrl.includes("?") ? "&" : "?") + cacheBust, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, data, _v: "V5.25", _ts: Date.now() })
  });
  return await parseResponse(res);
}

/* removedSaveSample removed in FINAL V5.25: all data comes from Google Sheet. */


/* removedDashboardSample removed in FINAL V5.25: all data comes from Google Sheet. */


const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

const DEPARTMENTS = [
  "อายุรกรรมชาย", "อายุรกรรมหญิง", "Cohort(ผู้ป่วยในรวม)", "ICUศัลยกรรม", "ICUอายุรกรรม",
  "ER(อุบัติเหตุฉุกเฉิน)", "หน่วยไตเทียมเฉลิมพระเกียรติ", "งานห้องผ่าตัด", "งานห้องผ่าตัดเล็ก",
  "LR(งานห้องคลอด)", "สูติ-นรีเวช", "ทันตกรรม", "กุมารเวชกรรม1", "กุมารเวชกรรม 2",
  "ศัลยกรรมชาย", "ศัลยกรรมหญิง", "ศัลยกรรมกระดูก", "ตึกตา", "หู คอ จมูก", "แพทย์แผนไทย",
  "OPD", "จิตเวช", "กายภาพ", "รังสีวิทยา", "ตึกพิเศษควรอยู่", "ตึกสงฆ์ 50ปี ชั้น 1", "ศูนย์เครื่องมือแพทย์", "อื่นๆ"
];

const EQUIPMENTS = [
  "Ventilator (เครื่องช่วยหายใจ)",
  "Infusion Pump (เครื่องให้สารละลายทางหลอดเลือดดำ)",
  "Syringe Pump (เครื่องให้สารละลายด้วยกระบอกฉีดยา)",
  "Defibrillator (เครื่องกระตุกหัวใจด้วยไฟฟ้า)",
  "AED (เครื่องกระตุกหัวใจด้วยไฟฟ้าชนิดอัตโนมัติ)",
  "Patient Monitor (เครื่องเฝ้าติดตามสัญญาณชีพ/วัดความดัน)",
  "ECG / EKG Machine (เครื่องตรวจคลื่นไฟฟ้าหัวใจ)",
  "Pulse Oximeter (เครื่องวัดความอิ่มตัวของออกซิเจนในเลือด)",
  "Endoscope (กล้องส่องตรวจภายใน)",
  "Infant Incubator (ตู้อบเด็กทารก)",
  "Thermometer (เครื่องวัดอุณหภูมิ)",
  "Oxygen Cylinder (ถังออกซิเจนสำรอง)",
  "Suction Machine (เครื่องดูดเสมหะ)",
  "Anesthesia Machine (เครื่องช่วยดมยาสลบ)",
  "Electrosurgical Unit (ESU) (เครื่องจี้และตัดด้วยไฟฟ้า)"
];

const DYNAMIC_CHECKLISTS = {
  "Ventilator (เครื่องช่วยหายใจ)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / Arm-support / ล้อเข็น / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "Humidifier / Heater bacteria filter" },
    { no: 5, text: "สายและ Adaptor Air / O2" },
    { no: 6, text: "Air filter / Fan filter" },
    { no: 7, text: "UPS / Stabilizer" },
    { no: 8, text: "Breathing Circuit / Humidifier / Bacteria filter และอื่นๆ" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ" },
    { no: 9, text: "การทดสอบ Self test (ก่อนใช้งาน หรือเปลี่ยน Circuit กับผู้ป่วย)" },
    { no: 10, text: "หน้าปัดและจอแสดงผล (ก่อนใช้งาน หรือเปลี่ยน Circuit กับผู้ป่วย)" },
    { no: 11, text: "สัญญาณการแจ้งเตือน (Alarm) (ก่อนใช้งาน หรือเปลี่ยน Circuit กับผู้ป่วย)" },
    { no: 12, text: "สวิตช์เลือก Mode / Function / ปุ่มปรับต่างๆ (ไม่ทดสอบขณะเปลี่ยน Circuit)" },
    { no: 13, text: "ตรวจเช็คแบตเตอรี่ (ไม่ทดสอบขณะเปลี่ยน Circuit กับผู้ป่วย)" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 14, text: "กำหนดการเปลี่ยนแบตเตอรี่และ O2 Cell ครั้งต่อไป" },
    { no: 15, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 16, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" },
    { section: "การตรวจสอบระหว่างใช้งานกับผู้ป่วย/วัน" },
    { no: 17, text: "ตรวจเช็คความสะอาด Circuit และน้ำขัง (กรณีที่ใช้งานเครื่อง)" },
    { no: 18, text: "การทำงานของอุปกรณ์ Humidifier, Heater filter" }
  ],
  "Defibrillator (เครื่องกระตุกหัวใจด้วยไฟฟ้า)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / สวิตช์เลือก Modeและพลังงาน / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "Lead ECG / Cable" },
    { no: 5, text: "Paddle / ปุ่ม Charge - Discharge พลังงาน" },
    { no: 6, text: "อุปกรณ์อื่นๆ เช่น SpO2 Finger Probe / ผ้าพันแขน / EtCO2" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ" },
    { no: 7, text: "หน้าปัดและจอแสดงผล / วันและเวลา" },
    { no: 8, text: "การทดสอบ Self-test ของเครื่อง" },
    { no: 9, text: "การทำงานของ / สวิตช์เลือก Mode และพลังงาน / ปุ่มปรับต่างๆ / การพิมพ์กระดาษ" },
    { no: 10, text: "การทำงานของ ECG หรือสังเกตจากการวัดจริง" },
    { no: 11, text: "การทำงานของ SpO2 , NIBP หรือสังเกตจากการวัดจริง (ถ้ามี)" },
    { no: 12, text: "Discharge พลังงานตามมาตรฐานของเครื่อง 3 ครั้ง" },
    { no: 13, text: "สัญญาณการแจ้งเตือน (Alarm)" },
    { no: 14, text: "ทดสอบแบตเตอรี่ (ถอดปลั๊ก) เปิดเครื่องอย่างน้อย 30 นาที" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 15, text: "กระดาษบันทึก / อิเล็กโทรดติดสัญญาณ ECG / Soft Paddle และอื่นๆ" },
    { no: 16, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 17, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 18, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" }
  ],
  "AED (เครื่องกระตุกหัวใจด้วยไฟฟ้าชนิดอัตโนมัติ)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง" },
    { no: 3, text: "ปุ่ม Analyze / Shock พลังงาน" },
    { no: 4, text: "Soft Paddle" },
    { no: 5, text: "ตู้เก็บเครื่อง / ชั้นวางเครื่องหรือที่ยึดเครื่อง" },
    { section: "ตรวจสอบสถานะพร้อมใช้งาน" },
    { no: 6, text: "สัญลักษณ์แสดงความพร้อมใช้ของเครื่อง" },
    { no: 7, text: "ความพร้อมใช้ของแบตเตอรี่" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 8, text: "Soft Paddle สำรอง" },
    { no: 9, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 10, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" }
  ],
  "ECG / EKG Machine (เครื่องตรวจคลื่นไฟฟ้าหัวใจ)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / สวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "ECG Electrode / Lead ECG / ECG Cable" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ" },
    { no: 5, text: "หน้าปัดและจอแสดงผล / วันและเวลา" },
    { no: 6, text: "การทำงานของสวิตช์เลือก Mode การใช้งาน / ปุ่มปรับต่างๆ / การพิมพ์กระดาษ" },
    { no: 7, text: "การทำงานของ ECG (กรณีตรวจสอบได้)" },
    { no: 8, text: "สัญญาณการแจ้งเตือน (Alarm)" },
    { no: 9, text: "ทดสอบแบตเตอรี่ (ถอดปลั๊ก) เปิดเครื่องอย่างน้อย 30 นาที" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 10, text: "กระดาษบันทึก / ECG Electrode / Gel และอื่นๆ" },
    { no: 11, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 12, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 13, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" }
  ],
  "Pulse Oximeter (เครื่องวัดความอิ่มตัวของออกซิเจนในเลือด)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / สวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "SpO2 Finger Probe / Cable" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ (ถอดปลั๊ก)" },
    { no: 5, text: "หน้าปัดและจอแสดงผล" },
    { no: 6, text: "การทำงานของสวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 7, text: "การทำงานของ SpO2 หรือสังเกตจากการวัดจริง" },
    { no: 8, text: "สัญญาณการแจ้งเตือน (Alarm)" },
    { no: 9, text: "ทดสอบแบตเตอรี่ เปิดเครื่องอย่างน้อย 30 นาที" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 10, text: "เตรียมอุปกรณ์สำรอง เช่น SpO2 probe ชนิดและขนาดต่างๆ" },
    { no: 11, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 12, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 13, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" }
  ],
  "Patient Monitor (เครื่องเฝ้าติดตามสัญญาณชีพ/วัดความดัน)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / สวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "Lead ECG / Cable" },
    { no: 5, text: "SpO2 Finger Probe / Cable" },
    { no: 6, text: "ผ้าพันแขน / สายท่อลม / ข้อต่อสาย / ผ้าพันแขนสำรอง" },
    { no: 7, text: "อื่นๆ (ถ้ามี) : IBP / EtCO2 / CO / Temp probe" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ" },
    { no: 8, text: "หน้าปัดและจอแสดงผล / วันและเวลา" },
    { no: 9, text: "การทำงานของสวิตช์เลือก Mode / ปุ่มปรับต่างๆ / การพิมพ์กระดาษ" },
    { no: 10, text: "การทำงานของ SpO2 หรือสังเกตจากการวัดจริง" },
    { no: 11, text: "การทำงานของ NIBP หรือสังเกตจากการวัดจริง" },
    { no: 12, text: "การทำงานของ ECG หรือสังเกตจากการวัดจริง" },
    { no: 13, text: "สัญญาณการแจ้งเตือน (Alarm)" },
    { no: 14, text: "ทดสอบแบตเตอรี่ (ถอดปลั๊ก) เปิดเครื่องอย่างน้อย 30 นาที" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 15, text: "กระดาษบันทึก / อิเล็กโทรดติดสัญญาน ECG และอื่นๆ" },
    { no: 16, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 17, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 18, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" }
  ],
  "Syringe Pump (เครื่องให้สารละลายด้วยกระบอกฉีดยา)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / สวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "ที่ยึดกระบอกฉีดยา" },
    { no: 5, text: "ที่ยึดก้านกระบอกฉีดยา" },
    { no: 6, text: "ที่ยึดเสาน้ำเกลือ" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ" },
    { no: 7, text: "หน้าปัดและจอแสดงผล" },
    { no: 8, text: "การทำงานของสวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 9, text: "ตัวล็อคกระบอกฉีดยา" },
    { no: 10, text: "การทำงานของก้านดันกระบอกฉีดยา" },
    { no: 11, text: "ทดสอบแบตเตอรี่ (ถอดปลั๊ก) เปิดเครื่อง ตั้ง Rate 30 ml/Hr อย่างน้อย 30 นาที" },
    { no: 12, text: "การทำงานของ Occlusion Detector" },
    { no: 13, text: "สัญญาณการแจ้งเตือน (Alarm)" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 14, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 15, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 16, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" }
  ],
  "Infusion Pump (เครื่องให้สารละลายทางหลอดเลือดดำ)": [
    { section: "ตรวจสอบสภาพทั่วไป" },
    { no: 1, text: "โครงสร้างเครื่อง / หน้าปัดและจอแสดงผล" },
    { no: 2, text: "สวิตช์ เปิด – ปิดเครื่อง / สวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 3, text: "ปลั๊กไฟ AC / สายไฟ AC / สายดิน (ขั้ว GND)" },
    { no: 4, text: "Drop Sensor / Cable (ถ้ามี)" },
    { no: 5, text: "Door / Clamp Lock" },
    { no: 6, text: "ที่ยึดเสาน้ำเกลือ" },
    { section: "เปิดเครื่องทดสอบประสิทธิภาพ" },
    { no: 7, text: "หน้าปัดและจอแสดงผล" },
    { no: 8, text: "การทำงานของสวิตช์เลือก Mode / ปุ่มปรับต่างๆ" },
    { no: 9, text: "การทำงาน Drop Sensor (ถ้ามี)" },
    { no: 10, text: "ทดสอบแบตเตอรี่ ถอดปลั๊ก เปิดเครื่อง ตั้ง Rate 200 ml/Hr อย่างน้อย 30 นาที" },
    { no: 11, text: "การทำงานของ Occlusion Detector (ทดสอบร่วมกับข้อ 10)" },
    { no: 12, text: "สัญญาณการแจ้งเตือน (Alarm)" },
    { section: "การจัดเตรียมอุปกรณ์ ความพร้อมใช้" },
    { no: 13, text: "กำหนดการเปลี่ยนแบตเตอรี่ครั้งต่อไป" },
    { no: 14, text: "กำหนดการสอบเทียบเครื่องมือแพทย์ (Due Date)" },
    { no: 15, text: "ชาร์จแบตเตอรี่เตรียมพร้อม (จำนวน 4-8 ชั่วโมง)" }
  ],
  "DEFAULT": [
    { no: 1, text: "สภาพเครื่องภายนอกสมบูรณ์ ไม่แตกหัก" },
    { no: 2, text: "สภาพปลั๊กและสายไฟปกติ ไม่ฉีกขาด" },
    { no: 3, text: "เปิด-ปิดเครื่อง (Power ON/OFF) ใช้งานได้ตามปกติ" },
    { no: 4, text: "อุปกรณ์ประกอบ (Accessories) ครบถ้วนพร้อมใช้" },
    { no: 5, text: "ทำความสะอาดเครื่องมือเรียบร้อยแล้ว" }
  ]
};

let base64Images = []; // array of {base64, type}
let imageType = null;
let globalRawData = [];
let globalDeptSettings = [];
let globalEquipmentList = [];
let globalUserLoginRows = [];
let currentDisplayedData = [];
let chartInstance = null;
let currentSortCol = "timestamp";
let sortAsc = false;
let lastFilteredData = [];
let currentPage = 1;
const ROWS_PER_PAGE = 15;


// ============================================================
// SETTINGS + LOGIN
// ============================================================
const SETTINGS_KEY = "uth_daily_check_settings_v4_DISABLED_V520";
const INITIAL_APPS_SCRIPT_URL = (window.DAILY_CHECK_CONFIG && window.DAILY_CHECK_CONFIG.APPS_SCRIPT_URL) || "";
const LOGIN_KEY = "uth_daily_check_logged_in_v5";
const LOGIN_USER_KEY = "uth_daily_check_user_v5";

function defaultSettings() {
  const cfg = window.DAILY_CHECK_CONFIG || {};
  return {
    appsScriptUrl: cfg.APPS_SCRIPT_URL || "",
    hospitalName: cfg.HOSPITAL_NAME || "โรงพยาบาลอุทัยธานี",
    systemName: cfg.SYSTEM_NAME || "ระบบ Daily Check เครื่องมือแพทย์",
    logoUrl: cfg.LOGO_URL || "logo-uth.png",
    adminEmail: "",
    sheetLink: cfg.SHEET_LINK || "",
    rootFolderId: "",
    summaryTime: "17:00"
  };
}

function getSettings() {
  // FINAL V5.25: ไม่อ่านค่า Setting จาก localStorage เพื่อไม่ให้จำ Apps Script URL เก่า
  return defaultSettings();
}

function applySettingsToConfig() {
  const cfg = window.DAILY_CHECK_CONFIG || {};
  window.DAILY_CHECK_CONFIG = Object.assign(cfg, {
    APPS_SCRIPT_URL: INITIAL_APPS_SCRIPT_URL || cfg.APPS_SCRIPT_URL,
    HOSPITAL_NAME: cfg.HOSPITAL_NAME || "โรงพยาบาลอุทัยธานี",
    SYSTEM_NAME: cfg.SYSTEM_NAME || "ระบบ Daily Check เครื่องมือแพทย์",
    LOGO_URL: cfg.LOGO_URL || "logo-uth.png",
    SHEET_LINK: cfg.SHEET_LINK || ""
  });
}



async function checkBackendVersionNow() {
  showLoading("กำลังตรวจ Backend...", "กำลังตรวจว่า Apps Script เป็นเวอร์ชันล่าสุดหรือไม่");
  try {
    const res = await callAppsScript("getVersion", {});
    const v = (res && (res.version || res.APP_VERSION || res.message)) || "";
    if (String(v).includes("V5.25.1_BUNDLE_FALLBACK")) {
      alert("Backend OK: " + v);
    } else {
      alert("Backend ยังไม่ใช่ V5.25\\nVersion ที่เจอ: " + (v || JSON.stringify(res)) + "\\n\\nให้ Deploy Apps Script ใหม่แบบ New version แล้ว Ctrl+F5");
    }
  } catch (e) {
    alert("ตรวจ Backend ไม่สำเร็จ: " + e.message);
  } finally {
    hideLoading(true);
  }
}

function toggleSettingSection(btn) {
  const section = btn.closest(".setting-section");
  if (section) section.classList.toggle("open");
}


function isUnknownActionMessage(msg) {
  return /Unknown action/i.test(String(msg || ""));
}

async function loadSettingsBundleCompat() {
  /*
   * FINAL V5.25.1
   * Try fast bundle first. If backend is older and does not know getSettingsBundle,
   * fall back to individual Sheet actions without showing error to the user.
   */
  try {
    const bundle = await callAppsScript("getSettingsBundle", {});
    if (bundle && bundle.success) return bundle;
    if (bundle && isUnknownActionMessage(bundle.error || bundle.message)) {
      throw new Error(bundle.error || bundle.message || "Backend ยังไม่มี getSettingsBundle แต่ระบบจะ fallback ไปโหลดทีละส่วนให้อัตโนมัติ");
    }
    // If bundle returns other errors, still try individual calls before failing.
  } catch (e) {
    if (!isUnknownActionMessage(e.message)) {
      console.warn("getSettingsBundle failed, fallback to individual actions:", e);
    }
  }

  const results = await Promise.allSettled([
    callAppsScript("getSettings", {}),
    callAppsScript("getUserLoginSettings", {}),
    callAppsScript("getDepartmentSettings", {}),
    callAppsScript("getEquipmentList", {})
  ]);

  const getVal = (idx, fallback) => {
    const r = results[idx];
    return r && r.status === "fulfilled" ? r.value : fallback;
  };

  const settings = getVal(0, { success: false, error: results[0] && results[0].reason ? results[0].reason.message : "getSettings failed" });
  const userLogin = getVal(1, { success: false, error: results[1] && results[1].reason ? results[1].reason.message : "getUserLoginSettings failed" });
  const departmentSettings = getVal(2, { success: false, error: results[2] && results[2].reason ? results[2].reason.message : "getDepartmentSettings failed" });
  let equipment = getVal(3, { success: false, equipmentList: [] });

  // Some deployed backends may not have getEquipmentList yet. Use departmentSettings.equipmentList instead.
  if (!equipment || !equipment.success) {
    equipment = {
      success: true,
      equipmentList: (departmentSettings && departmentSettings.equipmentList) || []
    };
  }

  return {
    success: true,
    settings,
    userLogin,
    departmentSettings,
    equipment,
    fallbackMode: true,
    version: "V5.32_LINE_DEPT_MESSAGE_ACTION"
  };
}


async function loadSettingsForm(forceRefresh = false) {
  const cfg = window.DAILY_CHECK_CONFIG || {};
  const defaults = {
    "setting-sheet-link": cfg.SHEET_LINK || "",
    "setting-admin-email": "",
    "setting-root-folder": "",
    "setting-summary-time": "17:00"
  };
  Object.entries(defaults).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = val || "";
  });

  const cached = readSettingsBundleCache();
  if (!forceRefresh && cached) applySettingsBundleToUi(cached);

  const userBox = document.getElementById("setting-userlogin-editor");
  const deptBox = document.getElementById("setting-dept-summary-cards");
  if (forceRefresh || !cached) {
    if (userBox) userBox.innerHTML = `<div class="p-3 text-xs text-slate-500">กำลังโหลดรหัสเข้าใช้งานจากชีต...</div>`;
    if (deptBox) deptBox.innerHTML = `<div class="text-sm text-slate-500 p-4 rounded-2xl bg-slate-50 border border-slate-200">กำลังโหลด KPI จากชีต...</div>`;
  }

  showLoading("กำลังโหลดข้อมูลตั้งค่า...", "กำลังเชื่อมต่อ Google Sheet");
  try {
    const results = await Promise.allSettled([
      callAppsScript("getSettings", {}),
      callAppsScript("getUserLoginSettings", {}),
      callAppsScript("getDepartmentSettings", {}),
      callAppsScript("getEquipmentList", {})
    ]);

    const getVal = (idx, fallback) => {
      const r = results[idx];
      return r && r.status === "fulfilled" ? r.value : fallback;
    };

    const bundle = {
      success: true,
      settings: getVal(0, { success: false, error: "โหลด Setting ไม่สำเร็จ" }),
      userLogin: getVal(1, { success: false, error: "โหลดรหัสเข้าใช้งานจากชีตไม่สำเร็จ" }),
      departmentSettings: getVal(2, { success: false, error: "โหลด KPI จากชีตไม่สำเร็จ" }),
      equipment: getVal(3, { success: true, equipmentList: [] }),
      version: "V5.32_LINE_DEPT_MESSAGE_ACTION"
    };
    if (!bundle.equipment || !bundle.equipment.success) {
      bundle.equipment = { success: true, equipmentList: (bundle.departmentSettings && bundle.departmentSettings.equipmentList) || [] };
    }

    writeSettingsBundleCache(bundle);
    applySettingsBundleToUi(bundle);

    if (bundle.userLogin && !bundle.userLogin.success) renderUserLoginLoadError(bundle.userLogin.error || "โหลดรหัสเข้าใช้งานจากชีตไม่สำเร็จ");
    if (bundle.departmentSettings && !bundle.departmentSettings.success) renderDepartmentSettingLoadError(bundle.departmentSettings.error || "โหลด KPI จากชีตไม่สำเร็จ");
  } catch (e) {
    console.warn("loadSettingsForm direct sheet load failed", e);
    if (!cached) {
      renderUserLoginLoadError(e.message);
      renderDepartmentSettingLoadError(e.message);
    }
  } finally {
    hideLoading(true);
  }
}




// ============================================================
// SETTINGS CACHE (FINAL V5.25)
// Keep latest Sheet settings in localStorage to avoid slow reload every time.
// This cache does NOT store or override Apps Script URL.
// ============================================================
const SETTINGS_BUNDLE_CACHE_KEY = "uth_daily_check_settings_bundle_v522";
const SETTINGS_BUNDLE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function readSettingsBundleCache() {
  try {
    const raw = localStorage.getItem(SETTINGS_BUNDLE_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.data || !obj.savedAt) return null;
    if (Date.now() - obj.savedAt > SETTINGS_BUNDLE_TTL_MS) return null;
    return obj.data;
  } catch (e) {
    console.warn("readSettingsBundleCache failed", e);
    return null;
  }
}

function writeSettingsBundleCache(data) {
  try {
    if (!data) return;
    localStorage.setItem(SETTINGS_BUNDLE_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data
    }));
  } catch (e) {
    console.warn("writeSettingsBundleCache failed", e);
  }
}

function updateSettingsBundleCache(partial) {
  const current = readSettingsBundleCache() || {};
  const next = Object.assign({}, current, partial || {});
  writeSettingsBundleCache(next);
  return next;
}

function applySettingsBundleToUi(bundle) {
  if (!bundle) return false;
  const cfg = window.DAILY_CHECK_CONFIG || {};
  const settings = bundle.settings || bundle;
  if (settings && settings.success) {
    const map = {
      "setting-sheet-link": settings.sheetLink || cfg.SHEET_LINK || "",
      "setting-admin-email": settings.adminEmail || "",
      "setting-root-folder": settings.rootFolderId || "",
      "setting-summary-time": settings.summaryTime || "17:00",
      "setting-line-token": settings.lineToken || "",
      "setting-line-to": settings.lineToId || "",
      "setting-line-oa": settings.lineOfficialId || "@447vrpet",
      "setting-stock-master": settings.stockMasterSheet || "รายการสินค้า"
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    });
  }

  const userRes = bundle.userLogin || {};
  if (userRes.success) {
    globalUserLoginRows = userRes.users || [];
    renderUserLoginEditor(globalUserLoginRows);
  }

  const deptRes = bundle.departmentSettings || {};
  if (deptRes.success) {
    globalDeptSettings = deptRes.settings || [];
    globalEquipmentList = (deptRes.equipmentList && deptRes.equipmentList.length ? deptRes.equipmentList : globalEquipmentList);
    renderDepartmentSettingCards(deptRes, "");
  }

  if (bundle.equipment && bundle.equipment.success && bundle.equipment.equipmentList) {
    globalEquipmentList = bundle.equipment.equipmentList || globalEquipmentList;
  }
  return true;
}

function buildCurrentSettingsBundleFromUi() {
  return {
    settings: {
      success: true,
      sheetLink: (document.getElementById("setting-sheet-link") || {}).value || "",
      adminEmail: (document.getElementById("setting-admin-email") || {}).value || "",
      rootFolderId: (document.getElementById("setting-root-folder") || {}).value || "",
      summaryTime: (document.getElementById("setting-summary-time") || {}).value || "17:00",
      lineToken: (document.getElementById("setting-line-token") || {}).value || "",
      lineToId: (document.getElementById("setting-line-to") || {}).value || "",
      lineOfficialId: (document.getElementById("setting-line-oa") || {}).value || "@447vrpet",
      stockMasterSheet: (document.getElementById("setting-stock-master") || {}).value || "รายการสินค้า"
    },
    userLogin: { success: true, users: globalUserLoginRows || [] },
    departmentSettings: { success: true, settings: globalDeptSettings || [], equipmentList: globalEquipmentList || [] },
    equipment: { success: true, equipmentList: globalEquipmentList || [] }
  };
}


function isUnknownActionError(resOrErr) {
  const msg = String((resOrErr && resOrErr.error) || (resOrErr && resOrErr.message) || resOrErr || "");
  return /Unknown action|saveUserLoginSettings|saveDepartmentSettings/i.test(msg);
}

function showBackendOldVersionAlert(actionName) {
  alert(
    "Apps Script Backend ยังเป็นเวอร์ชันเก่า จึงไม่รู้จัก action: " + actionName + "\\n\\n" +
    "วิธีแก้:\\n" +
    "1) เอา Code.js จาก ZIP V5.25 ไปแทนใน Apps Script\\n" +
    "2) Save\\n" +
    "3) Run function: setupEditableSheetsNow\\n" +
    "4) Deploy > Manage deployments > Edit > New version > Deploy\\n" +
    "5) กลับมาหน้าเว็บ กด Ctrl+F5 แล้วลองบันทึกใหม่"
  );
}

// ============================================================
// USER LOGIN INLINE EDITOR
// ============================================================
async function loadUserLoginSettings(forceRefresh = false) {
  const box = document.getElementById("setting-userlogin-editor");
  if (!box) return;

  const cached = readSettingsBundleCache();
  if (!forceRefresh && cached && cached.userLogin && cached.userLogin.success) {
    globalUserLoginRows = cached.userLogin.users || [];
    renderUserLoginEditor(globalUserLoginRows);
    return;
  }

  box.innerHTML = `<div class="p-3 text-xs text-slate-500">กำลังโหลด UserLogin จาก Sheet...</div>`;
  try {
    const res = await callAppsScript("getUserLoginSettings", {});
    if (res && res.success) {
      globalUserLoginRows = res.users || [];
      updateSettingsBundleCache({ userLogin: res });
      renderUserLoginEditor(globalUserLoginRows);
    } else {
      renderUserLoginLoadError((res && res.error) || "โหลด UserLogin จาก Sheet ไม่สำเร็จ");
    }
  } catch (e) {
    console.warn("loadUserLoginSettings failed", e);
    if (cached && cached.userLogin && cached.userLogin.success) {
      globalUserLoginRows = cached.userLogin.users || [];
      renderUserLoginEditor(globalUserLoginRows);
    } else {
      renderUserLoginLoadError(e.message);
    }
  }
}

function renderUserLoginLoadError(message) {
  const box = document.getElementById("setting-userlogin-editor");
  if (!box) return;
  box.innerHTML = `<div class="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl">
    โหลด UserLogin จาก Google Sheet ไม่สำเร็จ<br>
    <span class="text-xs">${escapeHTML(message || "")}</span><br>
    <span class="text-xs">ระบบจะไม่ใช้ sample/fallback data — กรุณาตรวจ Apps Script และ Deploy version ล่าสุด</span>
  </div>`;
}



function renderUserLoginEditor(users = []) {
  const box = document.getElementById("setting-userlogin-editor");
  if (!box) return;
  if (!users.length) {
    box.innerHTML = `<div class="p-4 text-sm text-slate-500">ยังไม่มีข้อมูลใน Sheet UserLogin — กดเพิ่ม User/แผนก เพื่อสร้างรายการใหม่</div>
      <table class="userlogin-table"><tbody id="userlogin-tbody"></tbody></table>`;
    return;
  }

  const rows = users.map(u => buildUserLoginRowHtml(u)).join("");
  box.innerHTML = `
    <table class="userlogin-table">
      <thead>
        <tr>
          <th style="width:120px">Code</th>
          <th style="width:180px">Name</th>
          <th>Department</th>
          <th style="width:110px">Role</th>
          <th style="width:90px">Active</th>
          <th style="width:70px"></th>
        </tr>
      </thead>
      <tbody id="userlogin-tbody">${rows}</tbody>
    </table>`;
}

function buildUserLoginRowHtml(u = {}) {
  const active = (u.active === false || String(u.active).toUpperCase() === "FALSE") ? "FALSE" : "TRUE";
  return `
    <tr>
      <td><input class="ul-code" value="${escapeHTML(u.code || "")}" placeholder="ADMF"></td>
      <td><input class="ul-name" value="${escapeHTML(u.name || "")}" placeholder="ชื่อ/แผนก"></td>
      <td><input class="ul-department" value="${escapeHTML(u.department || "")}" placeholder="ชื่อแผนก"></td>
      <td>
        <select class="ul-role">
          <option value="user" ${String(u.role || "user") === "user" ? "selected" : ""}>user</option>
          <option value="admin" ${String(u.role || "") === "admin" ? "selected" : ""}>admin</option>
          <option value="supervisor" ${String(u.role || "") === "supervisor" ? "selected" : ""}>supervisor</option>
        </select>
      </td>
      <td>
        <select class="ul-active">
          <option value="TRUE" ${active === "TRUE" ? "selected" : ""}>TRUE</option>
          <option value="FALSE" ${active === "FALSE" ? "selected" : ""}>FALSE</option>
        </select>
      </td>
      <td><button type="button" onclick="removeUserLoginRow(this)" class="text-red-600 text-xs font-bold hover:underline">ลบ</button></td>
    </tr>`;
}

function addUserLoginRow() {
  const tbody = document.getElementById("userlogin-tbody");
  if (!tbody) {
    renderUserLoginEditor([]);
    return;
  }
  tbody.insertAdjacentHTML("beforeend", buildUserLoginRowHtml({ role: "user", active: true }));
}

function removeUserLoginRow(btn) {
  const tr = btn.closest("tr");
  if (tr && confirm("ลบ User/Department Code นี้ใช่หรือไม่?")) tr.remove();
}

function getUserLoginRowsFromEditor() {
  const tbody = document.getElementById("userlogin-tbody");
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll("tr")).map(tr => ({
    code: (tr.querySelector(".ul-code") || {}).value || "",
    name: (tr.querySelector(".ul-name") || {}).value || "",
    department: (tr.querySelector(".ul-department") || {}).value || "",
    role: (tr.querySelector(".ul-role") || {}).value || "user",
    active: (tr.querySelector(".ul-active") || {}).value || "TRUE"
  })).filter(u => u.code.trim() && u.department.trim());
}

async function saveUserLoginSettingsOnly() {
  showLoading("กำลังบันทึก UserLogin...", "กำลังบันทึก Department Code Mapping");
  try {
    const users = getUserLoginRowsFromEditor();
    const res = await callAppsScript("saveUserLoginSettings", { users });
    if (res && res.success) {
      globalUserLoginRows = res.users || users;
      updateSettingsBundleCache({ userLogin: res });
      alert("บันทึก UserLogin สำเร็จ");
      renderUserLoginEditor(globalUserLoginRows);
      loadDepartmentSummarySettings();
    } else if (isUnknownActionError(res)) {
      showBackendOldVersionAlert("saveUserLoginSettings");
    } else {
      alert("บันทึก UserLogin ไม่สำเร็จ: " + ((res && res.error) || "Unknown error"));
    }
  } catch (e) {
    if (isUnknownActionError(e)) showBackendOldVersionAlert("saveUserLoginSettings");
    else alert("บันทึก UserLogin ไม่สำเร็จ: " + e.message);
  } finally {
    hideLoading(true);
  }
}

async function loadDepartmentSummarySettings(forceRefresh = false) {
  const box = document.getElementById("setting-dept-summary-cards");
  if (!box) return;

  const cached = readSettingsBundleCache();
  if (!forceRefresh && cached && cached.departmentSettings && cached.departmentSettings.success) {
    globalDeptSettings = cached.departmentSettings.settings || [];
    globalEquipmentList = cached.departmentSettings.equipmentList || globalEquipmentList || [];
    renderDepartmentSettingCards(cached.departmentSettings, "");
    return;
  }

  box.innerHTML = `<div class="text-sm text-slate-500 p-4 rounded-2xl bg-slate-50 border border-slate-200">กำลังโหลด DepartmentSetting จาก Sheet...</div>`;
  try {
    const res = await callAppsScript("getDepartmentSettings", {});
    if (res && res.success) {
      globalDeptSettings = res.settings || [];
      globalEquipmentList = res.equipmentList || globalEquipmentList || [];
      updateSettingsBundleCache({ departmentSettings: res, equipment: { success: true, equipmentList: globalEquipmentList } });
      renderDepartmentSettingCards(res, "");
    } else {
      renderDepartmentSettingLoadError((res && res.error) || "โหลด DepartmentSetting จาก Sheet ไม่สำเร็จ");
    }
  } catch (e) {
    console.warn("loadDepartmentSummarySettings failed", e);
    if (cached && cached.departmentSettings && cached.departmentSettings.success) {
      globalDeptSettings = cached.departmentSettings.settings || [];
      globalEquipmentList = cached.departmentSettings.equipmentList || globalEquipmentList || [];
      renderDepartmentSettingCards(cached.departmentSettings, "");
    } else {
      renderDepartmentSettingLoadError(e.message);
    }
  }
}

function renderDepartmentSettingLoadError(message) {
  const box = document.getElementById("setting-dept-summary-cards");
  if (!box) return;
  box.innerHTML = `<div class="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl">
    โหลด DepartmentSetting จาก Google Sheet ไม่สำเร็จ<br>
    <span class="text-xs">${escapeHTML(message || "")}</span><br>
    <span class="text-xs">ระบบจะไม่ใช้ sample/fallback data — กรุณาตรวจ Apps Script และ Deploy version ล่าสุด</span>
  </div>`;
}



function groupDepartmentSettings(settings) {
  const groups = {};
  (settings || []).forEach(s => {
    const dept = s.department || s.dept || "-";
    if (!dept || dept === "-") return;
    if (!groups[dept]) {
      groups[dept] = { department: dept, headEmail: s.headEmail || "", active: s.active !== false, equipmentTargets: {} };
    }
    if (s.headEmail) groups[dept].headEmail = s.headEmail;
    if (s.active === false) groups[dept].active = false;
    const equipment = s.equipment || s.equip || "__TOTAL__";
    groups[dept].equipmentTargets[equipment] = Number(s.targetPerDay || s.target || 0);
  });
  return groups;
}

function renderDepartmentSettingCards(res = {}, softMessage = "") {
  const box = document.getElementById("setting-dept-summary-cards");
  if (!box) return;

  const equipmentList = (res.equipmentList && res.equipmentList.length ? res.equipmentList : (globalEquipmentList && globalEquipmentList.length ? globalEquipmentList : EQUIPMENTS)).slice();
  globalEquipmentList = equipmentList.slice();
  const groups = groupDepartmentSettings(res.settings || globalDeptSettings || []);
  let departments = (res.departments || Object.keys(groups) || []).filter(d => d && d !== "ALL");

  if (!departments.length) {
    departments = DEPARTMENTS.filter(d => d !== "อื่นๆ");
  }

  departments = Array.from(new Set(departments)).sort((a,b) => a.localeCompare(b, "th"));

  const helpHtml = `
    <div class="dept-setting-help">
      <b>ข้อมูลมาจาก Google Sheet โดยตรง:</b> กดชื่อแผนกเพื่อเปิดรายละเอียด → ใส่ Gmail หัวหน้างาน → ใส่ Target ของแต่ละเครื่องมือ → กด <b>บันทึก KPI</b> หรือ <b>บันทึก Setting</b>
    </div>`;

  const msgHtml = softMessage ? `<div class="dept-setting-error-soft">${escapeHTML(softMessage)}</div>` : "";

  const cardsHtml = departments.map((dept, idx) => buildDeptSettingCardHtml(dept, groups[dept], equipmentList, idx === 0)).join("");
  box.innerHTML = helpHtml + msgHtml + cardsHtml;
  lucide.createIcons();
}

function buildDeptSettingCardHtml(dept, group, equipmentList, open = false) {
  group = group || { department: dept, headEmail: "", active: true, equipmentTargets: {} };
  const totalTarget = equipmentList.reduce((sum, eq) => sum + Number(group.equipmentTargets[eq] || 0), 0);
  const equipmentInputs = equipmentList.map(eq => {
    const value = Number(group.equipmentTargets[eq] || 0);
    return `
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-2">
        <label class="block text-[11px] font-black text-slate-600 leading-snug mb-2" title="${escapeHTML(eq)}">${escapeHTML(equipmentShort(eq))}</label>
        <input type="number" min="0" step="1" value="${value}" data-equipment="${escapeHTML(eq)}"
          class="dept-equip-target w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-uth-700 focus:border-uth-500 outline-none bg-white text-center">
      </div>`;
  }).join("");

  return `
    <div class="dept-setting-card ${open ? "open" : ""}" data-department="${escapeHTML(dept)}">
      <button type="button" class="dept-setting-head" onclick="toggleDeptSettingCard(this)">
        <div class="dept-setting-title">
          <i data-lucide="building-2" class="w-4 h-4 text-uth-600"></i>
          <span class="truncate">${escapeHTML(dept)}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-black text-uth-700 bg-uth-50 border border-uth-100 rounded-xl px-2.5 py-1">Target รวม: <b class="dept-total-target">${totalTarget}</b></span>
          <i data-lucide="chevron-down" class="dept-arrow w-5 h-5"></i>
        </div>
      </button>
      <div class="dept-setting-body">
        <div class="flex justify-end mb-2">
          <button type="button" onclick="removeDeptSettingCard(this)" class="dept-delete-btn">ลบแผนกนี้</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3 mb-4">
          <div>
            <label class="block text-xs font-black text-slate-500 mb-1">Department Email / Gmail หัวหน้างาน</label>
            <input type="email" class="dept-head-email w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-uth-500"
              placeholder="head.department@example.com" value="${escapeHTML(group.headEmail || "")}">
          </div>
          <div>
            <label class="block text-xs font-black text-slate-500 mb-1">Active</label>
            <select class="dept-active w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-uth-500">
              <option value="TRUE" ${group.active !== false ? "selected" : ""}>TRUE</option>
              <option value="FALSE" ${group.active === false ? "selected" : ""}>FALSE</option>
            </select>
          </div>
        </div>
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="text-xs font-black text-slate-500 uppercase">Department Total Equipments / Target per day by equipment</div>
          <button type="button" onclick="clearDeptEquipmentTargets(this)" class="text-xs font-bold text-slate-500 hover:text-red-600">ล้าง Target</button>
        </div>
        <div class="equipment-target-grid" oninput="updateDeptTotalTarget(this)">${equipmentInputs}</div>
      </div>
    </div>`;
}

function toggleDeptSettingCard(btn) {
  const card = btn.closest(".dept-setting-card");
  if (card) card.classList.toggle("open");
}

function addDepartmentSettingCard() {
  const name = prompt("กรอกชื่อแผนกที่ต้องการเพิ่ม");
  if (!name) return;
  const dept = name.trim();
  if (!dept) return;
  if (document.querySelector(`.dept-setting-card[data-department="${CSS.escape(dept)}"]`)) {
    alert("มีแผนกนี้อยู่แล้ว");
    return;
  }
  const box = document.getElementById("setting-dept-summary-cards");
  if (!box) return;
  box.insertAdjacentHTML("beforeend", buildDeptSettingCardHtml(dept, null, EQUIPMENTS || [], true));
  lucide.createIcons();
}

function removeDeptSettingCard(btn) {
  const card = btn.closest(".dept-setting-card");
  if (!card) return;
  const dept = card.getAttribute("data-department") || "";
  if (confirm("ต้องการลบแผนก " + dept + " ออกจาก DepartmentSetting ใช่หรือไม่?")) {
    card.remove();
  }
}

function clearDeptEquipmentTargets(btn) {
  const card = btn.closest(".dept-setting-card");
  if (!card) return;
  card.querySelectorAll(".dept-equip-target").forEach(input => input.value = 0);
  updateDeptTotalTarget(card);
}

function updateDeptTotalTarget(el) {
  const card = el.closest ? el.closest(".dept-setting-card") : el;
  if (!card) return;
  const total = Array.from(card.querySelectorAll(".dept-equip-target"))
    .reduce((sum, input) => sum + Number(input.value || 0), 0);
  const target = card.querySelector(".dept-total-target");
  if (target) target.textContent = total;
}

function getDepartmentSettingRowsFromCards() {
  const cards = Array.from(document.querySelectorAll(".dept-setting-card"));
  const rows = [];
  cards.forEach(card => {
    const department = card.getAttribute("data-department") || "";
    const headEmail = (card.querySelector(".dept-head-email") || {}).value || "";
    const active = (card.querySelector(".dept-active") || {}).value || "TRUE";
    card.querySelectorAll(".dept-equip-target").forEach(input => {
      rows.push({
        department,
        headEmail,
        equipment: input.getAttribute("data-equipment") || "",
        targetPerDay: Number(input.value || 0),
        active
      });
    });
  });
  return rows;
}

function getDepartmentSummaryCsvFromForm() {
  const rows = getDepartmentSettingRowsFromCards();
  const lines = ["Department,HeadEmail,Equipment,TargetPerDay,Active"];
  rows.forEach(r => {
    lines.push([r.department, r.headEmail, r.equipment, r.targetPerDay, r.active].map(v => String(v || "").replace(/,/g, " ")).join(","));
  });
  return lines.join("\n");
}

async function saveDepartmentSettingOnly() {
  showLoading("กำลังบันทึก KPI...", "กำลังบันทึก Department Email / Target ลง Sheet แบบ batch");
  try {
    const rows = getDepartmentSettingRowsFromCards();
    const res = await callAppsScript("saveDepartmentSettings", { settings: rows });
    if (res && res.success) {
      globalDeptSettings = res.settings || rows;
      globalEquipmentList = res.equipmentList || globalEquipmentList || [];
      updateSettingsBundleCache({ departmentSettings: res, equipment: { success: true, equipmentList: globalEquipmentList } });
      alert("บันทึก KPI / Department Email สำเร็จ");
      renderDepartmentSettingCards(res, "");
      renderDepartmentKpiDashboard();
    } else if (isUnknownActionError(res)) {
      showBackendOldVersionAlert("saveDepartmentSettings");
    } else {
      alert("บันทึกไม่สำเร็จ: " + ((res && res.error) || "Unknown error"));
    }
  } catch (e) {
    if (isUnknownActionError(e)) showBackendOldVersionAlert("saveDepartmentSettings");
    else alert("บันทึกไม่สำเร็จ: " + e.message + "\\nกรุณาตรวจสอบว่า Deploy Code.js เป็นเวอร์ชันล่าสุดแล้ว");
  } finally {
    hideLoading(true);
  }
}

async function saveSettings(options = {}) {
  const silent = !!(options && options.silent);
  const cfg = window.DAILY_CHECK_CONFIG || {};
  const s = {
    sheetLink: (document.getElementById("setting-sheet-link") || {}).value || cfg.SHEET_LINK || "",
    adminEmail: (document.getElementById("setting-admin-email") || {}).value || "",
    rootFolderId: (document.getElementById("setting-root-folder") || {}).value || "",
    summaryTime: (document.getElementById("setting-summary-time") || {}).value || "17:00",
      lineToken: (document.getElementById("setting-line-token") || {}).value || "",
      lineToId: (document.getElementById("setting-line-to") || {}).value || "",
      lineOfficialId: (document.getElementById("setting-line-oa") || {}).value || "@447vrpet",
      stockMasterSheet: (document.getElementById("setting-stock-master") || {}).value || "รายการสินค้า"
  };

  if (!silent) showLoading("กำลังบันทึก Setting...", "บันทึกเฉพาะ SystemConfig เพื่อให้เร็วขึ้น");

  try {
    const res = await callAppsScript("saveSettings", {
      adminEmail: s.adminEmail,
      spreadsheetId: extractSpreadsheetId(s.sheetLink) || (cfg.SPREADSHEET_ID || ""),
      sheetLink: s.sheetLink,
      rootFolderId: s.rootFolderId,
      summaryTime: s.summaryTime,
      lineToken: s.lineToken,
      lineToId: s.lineToId,
      lineOfficialId: s.lineOfficialId,
      stockMasterSheet: s.stockMasterSheet
    });
    if (!res || !res.success) throw new Error((res && res.error) || "saveSettings failed");
    updateSettingsBundleCache({ settings: res });
    if (!silent) alert("บันทึก Setting ลง Sheet SystemConfig สำเร็จ");
  } catch (e) {
    if (!silent) alert("บันทึก Setting ไม่สำเร็จ: " + e.message);
  } finally {
    if (!silent) hideLoading(true);
  }
}

async function syncSettingsToBackend() {
  alert("ปิดการ Sync จากหน้า Setting แล้ว\\nระบบใช้ Apps Script Web App URL จาก config.js และข้อมูลหลักจาก Google Sheet โดยตรง");
}

async function createDailySummaryTrigger() {
  await saveSettings({ silent: true });
  const s = getSettings();
  showLoading("กำลังตั้งแจ้งเตือนรายวัน...", "กำลังสร้าง Daily Trigger ใน Apps Script");
  try {
    const res = await callAppsScript("createDailySummaryTrigger", { summaryTime: s.summaryTime });
    if (res && res.success) {
      alert("ตั้ง Trigger ส่งสรุปรายวันแล้ว");
    } else {
      const msg = ((res && res.error) || "Unknown error");
      if (/script\.scriptapp|ScriptApp|getProjectTriggers|newTrigger/i.test(msg)) {
        alert(
          "ตั้ง Trigger ไม่สำเร็จ เพราะ Apps Script ยังไม่ได้รับสิทธิ์ ScriptApp\\n\\n" +
          "วิธีแก้:\\n" +
          "1) เปิด Apps Script Editor\\n" +
          "2) ใช้ Code.js + appsscript.json จาก ZIP FULL ล่าสุด\\n" +
          "3) Save\\n" +
          "4) Run function: forceAuthNow\\n" +
          "5) Allow permissions\\n" +
          "6) Run function: installDailySummaryTriggerFromEditor\\n" +
          "7) Deploy New version"
        );
      } else {
        alert("ตั้ง Trigger ไม่สำเร็จ: " + msg);
      }
    }
  } finally {
    hideLoading(true);
  }
}

async function testDailySummaryEmail() {
  if (!confirm("ต้องการทดสอบส่งสรุปรายวันไป Admin Email ใช่หรือไม่?")) return;
  showLoading("กำลังส่งสรุปรายวัน...", "กำลังสร้าง PDF และส่งอีเมลไปยัง Admin");
  try {
    const res = await callAppsScript("sendDailySummaryNow", {});
    if (res && res.success) alert("ส่งสรุปรายวันแล้ว");
    else alert("ส่งไม่สำเร็จ: " + ((res && res.error) || "Unknown error"));
  } finally {
    hideLoading(true);
  }
}

function extractSpreadsheetId(value) {
  const s = String(value || "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return "";
}

function allowedLoginCodes() {
  const s = getSettings();
  return String(s.loginCodes || "UTH").split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
}

function getLoggedInUser() {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_USER_KEY) || sessionStorage.getItem(LOGIN_USER_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return !!getLoggedInUser() || localStorage.getItem(LOGIN_KEY) === "1" || sessionStorage.getItem(LOGIN_KEY) === "1";
}

function showRequestAccessInfo() {
  openAccessRequestModal();
}

function setupLogin() {
  const overlay = document.getElementById("login-overlay");
  if (!overlay) return;
  if (isLoggedIn()) {
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
    applyLoginUserToUI();
  } else {
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    setTimeout(() => {
      const input = document.getElementById("login-code-input");
      if (input) input.focus();
    }, 150);
  }

  const input = document.getElementById("login-code-input");
  if (input && !input.dataset.bound) {
    input.dataset.bound = "1";
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") submitLoginCode();
    });
  }
}

/* fallbackLoginUser removed in FINAL V5.25: all data comes from Google Sheet. */


async function submitLoginCode() {
  const input = document.getElementById("login-code-input");
  const err = document.getElementById("login-error");
  const remember = document.getElementById("login-remember");
  const code = String(input ? input.value : "").trim().toUpperCase();

  if (!code) {
    if (err) {
      err.textContent = "กรุณากรอกรหัสแผนก";
      err.classList.remove("hidden");
    }
    return;
  }

  showLoading("กำลังเข้าสู่ระบบ...", "กำลังตรวจสอบรหัสแผนกจากชีต UserLogin");
  let user = null;
  try {
    const res = await callAppsScript("loginUser", { code });
    if (res && res.success && res.user) user = res.user;
  } catch (e) {
    console.warn("Backend login failed", e);
    if (err) {
      err.textContent = "เชื่อมต่อชีต UserLogin ไม่สำเร็จ กรุณาตรวจ Apps Script และ Deploy version ล่าสุด";
      err.classList.remove("hidden");
    }
    hideLoading(true);
    return;
  }

  if (user) {
    if (remember && remember.checked) {
      localStorage.setItem(LOGIN_KEY, "1");
      localStorage.setItem(LOGIN_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.setItem(LOGIN_KEY, "1");
      sessionStorage.setItem(LOGIN_USER_KEY, JSON.stringify(user));
    }
    if (err) err.classList.add("hidden");
    await logLoginSuccess(user);
    setupLogin();
  } else {
    if (err) {
      err.textContent = "รหัสแผนกไม่ถูกต้อง หรือยังไม่ได้เปิดใช้งาน";
      err.classList.remove("hidden");
    }
  }
  hideLoading(true);
}

function applyLoginUserToUI() {
  const user = getLoggedInUser();
  if (!user) return;
  const dept = user.department || user.dept || "ALL";
  if (!dept || dept === "ALL") return;

  const deptSelect = document.getElementById("department");
  if (deptSelect) {
    if (![...deptSelect.options].some(o => o.value === dept)) deptSelect.appendChild(new Option(dept, dept));
    deptSelect.value = dept;
  }

  const filterDept = document.getElementById("filter-dept");
  if (filterDept) {
    if (![...filterDept.options].some(o => o.value === dept)) filterDept.appendChild(new Option(dept, dept));
    filterDept.value = dept;
  }
}

function applyUserDepartmentFilter() {
  const user = getLoggedInUser();
  if (!user) return;
  const dept = user.department || user.dept || "ALL";
  if (!dept || dept === "ALL") return;
  const filterDept = document.getElementById("filter-dept");
  if (filterDept) {
    if (![...filterDept.options].some(o => o.value === dept)) filterDept.appendChild(new Option(dept, dept));
    filterDept.value = dept;
  }
}

function logoutDailyCheck() {
  localStorage.removeItem(LOGIN_KEY);
  sessionStorage.removeItem(LOGIN_KEY);
  localStorage.removeItem(LOGIN_USER_KEY);
  sessionStorage.removeItem(LOGIN_USER_KEY);
  setupLogin();
}


function getCurrentLoginLogInfo() {
  const user = getLoggedInUser ? getLoggedInUser() : null;
  const loginCode = user && user.code ? String(user.code) : "-";
  const loginName = user && user.name ? String(user.name) : "-";
  const loginDepartment = user && (user.department || user.dept) ? String(user.department || user.dept) : "-";
  const loginRole = user && user.role ? String(user.role) : "-";
  return {
    // User Log ใช้ UserName เป็น Code - Name เพื่อให้เห็นรายละเอียดครบใน column เดียว
    userName: user ? (loginCode + " - " + loginName) : "-",
    loginCode,
    loginName,
    loginDepartment,
    loginRole,
    pageUrl: location.href
  };
}

async function logLoginSuccess(user) {
  try {
    const sessionId = window._sessionId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    window._sessionId = sessionId;
    const info = getCurrentLoginLogInfo();
    await callAppsScript("log", Object.assign({
      event: "login_success",
      sessionId,
      page: "login",
      startTime: new Date().toISOString(),
      userAgent: navigator.userAgent
    }, info));
  } catch (e) {
    console.warn("logLoginSuccess failed", e);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}


// ============================================================
// GLOBAL LOADING POPUP
// ============================================================
let uthLoadingCount = 0;
function ensureGlobalLoadingOverlay() {
  let overlay = document.getElementById("global-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "global-loading-overlay";
    overlay.className = "uth-loading-overlay";
    overlay.innerHTML = `
      <div class="uth-loading-card">
        <div class="uth-loading-spinner"></div>
        <h3 id="global-loading-title" class="uth-loading-title">กำลังประมวลผล...</h3>
        <p id="global-loading-detail" class="uth-loading-detail">กรุณารอสักครู่</p>
        <div class="uth-loading-progress"><div></div></div>
      </div>`;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function showLoading(title = "กำลังประมวลผล...", detail = "กรุณารอสักครู่") {
  uthLoadingCount++;
  const overlay = ensureGlobalLoadingOverlay();
  const titleEl = document.getElementById("global-loading-title");
  const detailEl = document.getElementById("global-loading-detail");
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  overlay.classList.add("show");
}

function updateLoading(title, detail) {
  const titleEl = document.getElementById("global-loading-title");
  const detailEl = document.getElementById("global-loading-detail");
  if (titleEl && title) titleEl.textContent = title;
  if (detailEl && detail) detailEl.textContent = detail;
}

function hideLoading(force = false) {
  if (force) uthLoadingCount = 0;
  else uthLoadingCount = Math.max(0, uthLoadingCount - 1);
  if (uthLoadingCount === 0) {
    const overlay = document.getElementById("global-loading-overlay");
    if (overlay) overlay.classList.remove("show");
  }
}

function equipmentShort(equip) {
  return String(equip || "-").split(" (")[0];
}

function isNormalStatus(status) {
  return status === "ปกติ" || status === "พร้อมใช้งาน" || status === "พร้อมใช้";
}

function formatDateTime(dateObj) {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getRowDate(row) {
  if (row.checkDate) return row.checkDate;
  if (row.rawDate) {
    const d = new Date(row.rawDate);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

function dateParts(row) {
  const ds = getRowDate(row);
  if (!ds) return { y: "", m: "", d: "" };
  const [y, m, d] = ds.split("-");
  return { y: Number(y), m: Number(m), d: Number(d) };
}

function normalizeRow(row) {
  const rawImgs = Array.isArray(row.imgs)
    ? row.imgs
    : String(row.imgs || row.images || row.imageUrls || row.fileUrls || "")
        .split(/\n|,\s*/)
        .map(x => String(x || "").trim())
        .filter(Boolean);

  const imgs = rawImgs.filter(u => u && u !== "-");
  const firstImg = row.img || row.imageUrl || imgs[0] || null;
  if (firstImg && !imgs.includes(firstImg)) imgs.unshift(firstImg);

  return {
    rawDate: row.rawDate || null,
    timestamp: row.timestamp || formatDateTime(row.rawDate),
    checkDate: row.checkDate || row.date || getRowDate(row),
    dept: row.dept || row.department || "-",
    equip: row.equip || row.equipment || "-",
    sn: String(row.sn || row.serialNo || "-"),
    deviceIdCode: String(row.deviceIdCode || row.deviceId || row.idCode || ""),
    assetNo: String(row.assetNo || row.asset || row.assetNumber || ""),
    inspector: row.inspector || row.checker || row.checkedBy || "-",
    checkText: row.checkText || row.checklist || "-",
    status: row.status || "-",
    note: row.note || "-",
    img: firstImg,
    imgs
  };
}

function switchTab(tabName) {
  ["form-page", "dashboard-page", "success-page", "settings-page"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("page-hidden");
  });

  const btnForm = document.getElementById("tab-form-btn");
  const btnDash = document.getElementById("tab-dash-btn");
  const btnSettings = document.getElementById("tab-settings-btn");
  const btnFormMob = document.getElementById("tab-form-btn-mob");
  const btnDashMob = document.getElementById("tab-dash-btn-mob");
  const btnSettingsMob = document.getElementById("tab-settings-btn-mob");

  [btnForm, btnDash, btnSettings].forEach(btn => {
    if (btn) btn.className = "px-4 py-2 rounded-xl font-medium transition-all hover:bg-white/10 text-uth-100 flex items-center gap-2";
  });
  [btnFormMob, btnDashMob, btnSettingsMob].forEach(btn => {
    if (btn) btn.className = "flex-1 py-3 text-center text-sm font-medium border-b-2 border-transparent text-uth-200";
  });

  if (tabName === "form") {
    document.getElementById("form-page").classList.remove("page-hidden");
    if (btnForm) { btnForm.classList.add("bg-white/20", "text-white"); btnForm.classList.remove("text-uth-100"); }
    if (btnFormMob) { btnFormMob.classList.add("border-white", "text-white"); btnFormMob.classList.remove("border-transparent"); }

    const form = document.getElementById("daily-form");
    if (form) form.reset();
    document.getElementById("date").valueAsDate = new Date();
    document.getElementById("checklist-container").classList.add("hidden");
    const otherDept = document.getElementById("other-dept-container");
    if (otherDept) otherDept.classList.add("hidden");
    const brokenZone = document.getElementById("broken-zone");
    if (brokenZone) brokenZone.classList.add("hidden");
    base64Images = [];
    const previews = document.getElementById("image-previews");
    if (previews) previews.innerHTML = "";
    const placeholder = document.getElementById("image-placeholder");
    if (placeholder) placeholder.classList.remove("hidden");
    const btnRemove = document.getElementById("btn-remove-image");
    if (btnRemove) btnRemove.classList.add("hidden");
    const savedInspector = localStorage.getItem("uth_inspector");
    if (savedInspector) document.getElementById("inspector").value = savedInspector;
    applyLoginUserToUI();
  } else if (tabName === "settings") {
    document.getElementById("settings-page").classList.remove("page-hidden");
    if (btnSettings) { btnSettings.classList.add("bg-white/20", "text-white"); btnSettings.classList.remove("text-uth-100"); }
    if (btnSettingsMob) { btnSettingsMob.classList.add("border-white", "text-white"); btnSettingsMob.classList.remove("border-transparent"); }
    loadSettingsForm();
  } else {
    document.getElementById("dashboard-page").classList.remove("page-hidden");
    if (btnDash) { btnDash.classList.add("bg-white/20", "text-white"); btnDash.classList.remove("text-uth-100"); }
    if (btnDashMob) { btnDashMob.classList.add("border-white", "text-white"); btnDashMob.classList.remove("border-transparent"); }
    if (globalRawData.length === 0) loadDashboardData();
    else resyncDashboardDataSilent();
  }
  lucide.createIcons();
}


const USAGE_HELP = {
  login: {
    title: "วิธีใช้งานเบื้องต้นการเข้าสู่ระบบ",
    body: [
      "กรอกรหัสแผนกที่ได้รับจากผู้ดูแลระบบ เช่น ADMF, ADMM, ER, OR",
      "กดปุ่ม “เข้าสู่ระบบ / ตรวจรหัส” ระบบจะตรวจข้อมูลจากชีต UserLogin",
      "ถ้าเปิดใช้งานแล้ว ระบบจะเลือกแผนกให้อัตโนมัติในหน้าบันทึกและหน้ารายการสรุป",
      "ถ้ายังไม่มีรหัส ให้กด “ขอเปิดใช้งานรหัสแผนก” และรออีเมลอนุมัติจากผู้ดูแลระบบ"
    ]
  },
  form: {
    title: "วิธีใช้งานเบื้องต้นบันทึกการตรวจสอบประจำวัน",
    body: [
      "เลือกแผนก / หน่วยงาน และประเภทเครื่องมือ",
      "กรอก ID CODE เป็นข้อมูลบังคับ ส่วนรหัสเครื่อง / SN และหมายเลขครุภัณฑ์เป็นข้อมูลไม่บังคับ",
      "เลือก PASS/FAIL ในรายการ Checklist ให้ครบถ้วน",
      "เลือกสถานะเครื่องมือ แนบรูปภาพ แล้วกดบันทึกข้อมูล",
      "ขณะบันทึก ระบบจะแสดงหน้าต่างกำลังบันทึกจนกว่าจะเสร็จ"
    ]
  },
  dashboard: {
    title: "วิธีใช้งานเบื้องต้นแดชบอร์ดสรุปข้อมูลการตรวจสอบเครื่องมือแพทย์ประจำวัน",
    body: [
      "ใช้ตัวกรองวันที่ เดือน ปี แผนก ประเภทเครื่องมือ สถานะ หรือค้นหา ID/SN/ครุภัณฑ์",
      "ดู KPI เปรียบเทียบ Actual กับ Target ตามแผนกหรือรายเครื่องมือ",
      "กดรายการในตารางเพื่อดูรายละเอียด รูปภาพ และ Checklist",
      "ใช้ปุ่มส่งออก PDF / Excel หรือรายงานรายเดือนตามต้องการ"
    ]
  },
  settings: {
    title: "วิธีใช้งานเบื้องต้นการตั้งค่า",
    body: [
      "ตั้งค่า Google Sheet, Admin Email, Root Folder และเวลาส่งสรุปรายวัน",
      "จัดการรหัสเข้าใช้งานของแต่ละแผนกจากส่วนแผนกและรหัสเข้าใช้งาน",
      "ตั้งค่าอีเมลหัวหน้าแผนกและ Target KPI รายเครื่องมือ",
      "กดบันทึกหลังแก้ไขข้อมูล เพื่อให้ข้อมูลอัปเดตกลับไปยัง Google Sheet"
    ]
  }
};

function showUsageInfo(topic = "login") {
  const data = USAGE_HELP[topic] || USAGE_HELP.login;
  const title = document.getElementById("usage-info-title");
  const body = document.getElementById("usage-info-body");
  if (title) title.innerHTML = `<i data-lucide="info" class="w-5 h-5"></i> ${escapeHTML(data.title)}`;
  if (body) {
    body.innerHTML = data.body.map((text, idx) => `
      <div class="flex gap-3">
        <div class="w-6 h-6 rounded-full bg-uth-50 text-uth-700 font-black flex items-center justify-center shrink-0">${idx + 1}</div>
        <div>${escapeHTML(text)}</div>
      </div>
    `).join("");
  }
  const modal = document.getElementById("usage-info-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
  lucide.createIcons();
}

function closeUsageInfo() {
  const modal = document.getElementById("usage-info-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function openAccessRequestModal() {
  const modal = document.getElementById("access-request-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    setTimeout(() => {
      const input = document.getElementById("req-name");
      if (input) input.focus();
    }, 100);
  }
  lucide.createIcons();
}

function closeAccessRequestModal() {
  const modal = document.getElementById("access-request-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

async function submitAccessRequest(e) {
  e.preventDefault();
  const payload = {
    requesterName: (document.getElementById("req-name") || {}).value || "",
    requesterEmail: (document.getElementById("req-email") || {}).value || "",
    departmentCode: (document.getElementById("req-code") || {}).value || "",
    departmentName: (document.getElementById("req-dept") || {}).value || "",
    note: (document.getElementById("req-note") || {}).value || ""
  };

  if (!payload.requesterName.trim() || !payload.requesterEmail.trim() || !payload.departmentCode.trim() || !payload.departmentName.trim()) {
    alert("กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน");
    return;
  }

  showLoading("กำลังส่งคำขอเปิดใช้งาน...", "ระบบกำลังส่งอีเมลแจ้งผู้ดูแลระบบเพื่ออนุมัติ");
  try {
    const res = await callAppsScript("requestDepartmentAccess", payload);
    if (!res || !res.success) throw new Error((res && res.error) || "ส่งคำขอไม่สำเร็จ");
    alert("ส่งคำขอสำเร็จ\\nระบบได้แจ้งผู้ดูแลระบบแล้ว เมื่ออนุมัติแล้วผู้ขอจะได้รับอีเมลตอบกลับ");
    const form = document.getElementById("access-request-form");
    if (form) form.reset();
    closeAccessRequestModal();
  } catch (err) {
    alert("ส่งคำขอไม่สำเร็จ: " + err.message);
  } finally {
    hideLoading(true);
  }
}


function setupBranding() {
  const cfg = window.DAILY_CHECK_CONFIG || {};
  const logo = cfg.LOGO_URL || "logo-uth.png";
  document.getElementById("app-logo").src = logo;
  document.getElementById("app-hospital").innerText = cfg.HOSPITAL_NAME || "โรงพยาบาลอุทัยธานี";
  document.getElementById("app-system").innerText = cfg.SYSTEM_NAME || "ระบบ Daily Check เครื่องมือแพทย์";

  ["icon", "shortcut icon", "apple-touch-icon"].forEach(rel => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = "./" + String(logo).replace("./", "") + "?v=5.32";
    if (rel !== "apple-touch-icon") link.type = "image/png";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applySettingsToConfig();
  setupLogin();
  setupBranding();
  startClock();
  lucide.createIcons();
  document.getElementById("date").valueAsDate = new Date();
  DEPARTMENTS.forEach(d => document.getElementById("department").appendChild(new Option(d, d)));
  EQUIPMENTS.forEach(e => document.getElementById("equipment").appendChild(new Option(e, e)));
  bindFormEvents();
  const accessForm = document.getElementById("access-request-form");
  if (accessForm && !accessForm.dataset.bound) { accessForm.dataset.bound = "1"; accessForm.addEventListener("submit", submitAccessRequest); }
  applyLoginUserToUI();

  // Remember inspector name
  const savedInspector = localStorage.getItem("uth_inspector");
  if (savedInspector) document.getElementById("inspector").value = savedInspector;

  // Log page visit
  logPageVisit();

  // Auto resync dashboard every 1 minute
  startDashboardAutoResync();
  loadSettingsForm();
});

function bindFormEvents() {
  document.getElementById("department").addEventListener("change", (e) => {
    const container = document.getElementById("other-dept-container");
    const input = document.getElementById("other-dept");
    if (e.target.value === "อื่นๆ") {
      container.classList.remove("hidden");
      input.required = true;
    } else {
      container.classList.add("hidden");
      input.required = false;
      input.value = "";
    }
  });

  document.getElementById("equipment").addEventListener("change", (e) => {
    const items = DYNAMIC_CHECKLISTS[e.target.value] || DYNAMIC_CHECKLISTS.DEFAULT;
    renderChecklist(items);
    document.getElementById("checklist-container").classList.remove("hidden");
  });

  document.getElementById("btn-select-all").innerText = "PASS all";
  document.getElementById("btn-select-all").addEventListener("click", () => setChecklistAll("PASS"));

  document.getElementById("btn-clear-all").innerText = "Clear";
  document.getElementById("btn-clear-all").addEventListener("click", () => setChecklistAll("CLEAR"));

  const btnAddChecklist = document.getElementById("btn-add-checklist"); if (btnAddChecklist) btnAddChecklist.addEventListener("click", () => {
    const input = document.getElementById("custom-checklist-input"); if (!input) return;
    const val = input.value.trim();
    if (val) {
      const idx = document.querySelectorAll(".uth-check-row").length;
      appendChecklistItem(val, idx, idx + 1);
      input.value = "";
      lucide.createIcons();
    }
  });

  document.querySelectorAll('input[name="status"]').forEach(r => {
    r.addEventListener("change", (e) => {
      const bZone = document.getElementById("broken-zone");
      const note = document.getElementById("note");
      if (e.target.value === "ชำรุด") {
        bZone.classList.remove("hidden");
        note.required = true;
      } else {
        bZone.classList.add("hidden");
        note.required = false;
        note.value = "";
      }
    });
  });

  document.getElementById("image-upload").addEventListener("change", handleImageUpload);
  document.getElementById("btn-remove-image").addEventListener("click", resetImage);
  document.getElementById("daily-form").addEventListener("submit", handleSubmit);
  document.getElementById("new-record-btn").addEventListener("click", resetFormForNextRecord);
}

function addChecklistPairStyles() {
  if (document.getElementById("uth-checklist-pair-style")) return;
  const style = document.createElement("style");
  style.id = "uth-checklist-pair-style";
  style.textContent = `
    #checklist-items{background:#fff4fb!important;border:1px solid #efc8ec!important;border-radius:18px!important;padding:14px!important}
    .uth-check-section{background:#dbe7f3;border:1px solid #8aa2bd;color:#0f172a;border-radius:10px;padding:9px 12px;margin:12px 0 8px;text-align:center;font-weight:900;font-size:.88rem}
    .uth-check-row{display:grid;grid-template-columns:1fr 164px;gap:12px;align-items:center;background:#fff;border:1px solid #efc8ec;border-radius:13px;padding:10px 12px;margin:8px 0;box-shadow:0 2px 8px rgba(154,27,142,.035)}
    .uth-check-text{font-weight:800;color:#0f172a;line-height:1.28;font-size:.89rem}
    .uth-check-pf{display:flex;gap:16px;align-items:center;justify-content:flex-end;white-space:nowrap}
    .uth-check-pf label{display:inline-flex;gap:5px;align-items:center;font-weight:900;color:#9a1b8e;font-size:.78rem;cursor:pointer;margin:0}
    .uth-check-pf input{width:15px;height:15px;accent-color:#9a1b8e;cursor:pointer;margin:0}
    @media(max-width:680px){.uth-check-row{grid-template-columns:1fr}.uth-check-pf{justify-content:flex-start}}
  `;
  document.head.appendChild(style);
}

function enforceChecklistPair(input) {
  const row = input.closest(".uth-check-row");
  if (!row) return;
  row.querySelectorAll(".checklist-input").forEach(el => {
    if (el !== input) el.checked = false;
  });
}

function setChecklistAll(result) {
  document.querySelectorAll(".uth-check-row").forEach(row => {
    const pass = row.querySelector('.checklist-input[value="PASS"]');
    const fail = row.querySelector('.checklist-input[value="FAIL"]');
    if (result === "CLEAR") {
      if (pass) pass.checked = false;
      if (fail) fail.checked = false;
    } else {
      if (pass) pass.checked = true;
      if (fail) fail.checked = false;
    }
  });
}

function renderChecklist(items) {
  addChecklistPairStyles();
  const listDiv = document.getElementById("checklist-items");
  listDiv.innerHTML = "";
  let idx = 0;
  items.forEach(item => {
    if (item.section) {
      listDiv.insertAdjacentHTML("beforeend", `<div class="uth-check-section">${escapeHTML(item.section)}</div>`);
    } else {
      appendChecklistItem(item.text, idx, item.no || idx + 1);
      idx += 1;
    }
  });
  lucide.createIcons();
}

function appendChecklistItem(text, idx, no) {
  const safeText = escapeHTML(text);
  document.getElementById("checklist-items").insertAdjacentHTML("beforeend", `
    <div class="uth-check-row" data-checklist-row="${idx}">
      <div class="uth-check-text"><span class="font-bold text-uth-700">${no}.</span> ${safeText}</div>
      <div class="uth-check-pf">
        <label><input type="checkbox" class="checklist-input checklist-result" value="PASS" data-index="${idx}" data-no="${no}" data-text="${safeText}" checked onchange="enforceChecklistPair(this)">PASS</label>
        <label><input type="checkbox" class="checklist-input checklist-result" value="FAIL" data-index="${idx}" data-no="${no}" data-text="${safeText}" onchange="enforceChecklistPair(this)">FAIL</label>
      </div>
    </div>
  `);
}

function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  if (base64Images.length + files.length > 5) {
    alert("แนบได้สูงสุด 5 รูป");
    e.target.value = "";
    return;
  }
  const toProcess = files.slice(0, 5 - base64Images.length);
  let processed = 0;
  toProcess.forEach(file => {
    if (!file.type.startsWith("image/")) {
      processed++;
      if (processed === toProcess.length) renderImagePreviews();
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 640; // FINAL V5.26: smaller image = faster save
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        base64Images.push({ base64: canvas.toDataURL("image/jpeg", 0.50), type: "image/jpeg" });
        processed++;
        if (processed === toProcess.length) renderImagePreviews();
      };
      img.onerror = () => { processed++; if (processed === toProcess.length) renderImagePreviews(); };
      img.src = ev.target.result;
    };
    reader.onerror = () => { processed++; if (processed === toProcess.length) renderImagePreviews(); };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = document.getElementById("image-previews");
  container.innerHTML = base64Images.map((item, i) => {
    // images only
    return `<div class="relative rounded-lg overflow-hidden border border-slate-200 h-20"><img src="${item.base64}" class="w-full h-full object-cover"><button type="button" onclick="removeImage(${i})" class="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center">×</button></div>`;
  }).join("");
  document.getElementById("image-placeholder").classList.toggle("hidden", base64Images.length > 0);
  document.getElementById("btn-remove-image").classList.toggle("hidden", base64Images.length === 0);
  lucide.createIcons();
}

function removeImage(idx) {
  base64Images.splice(idx, 1);
  renderImagePreviews();
}

function resetImage() {
  base64Images = [];
  imageType = null;
  document.getElementById("image-upload").value = "";
  document.getElementById("image-previews").innerHTML = "";
  document.getElementById("image-placeholder").classList.remove("hidden");
  document.getElementById("btn-remove-image").classList.add("hidden");
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!document.getElementById("equipment").value) { alert("กรุณาเลือกประเภทเครื่องมือ"); return; }
  if (!document.getElementById("idCode").value.trim()) { alert("กรุณากรอก ID CODE"); return; }
  if (base64Images.length === 0) { alert("กรุณาถ่ายรูปหรือแนบรูปภาพเครื่องมือก่อนบันทึก"); return; }

  let dept = document.getElementById("department").value;
  if (dept === "อื่นๆ") dept = document.getElementById("other-dept").value.trim();

  const checkItemsObj = {};
  const checklistTexts = {};
  const checklistResults = [];
  document.querySelectorAll(".uth-check-row").forEach(row => {
    const fallback = row.querySelector(".checklist-input");
    const selected = row.querySelector('.checklist-input[value="FAIL"]:checked') || row.querySelector('.checklist-input[value="PASS"]:checked');
    if (!fallback) return;
    const key = fallback.getAttribute("data-index");
    const text = fallback.getAttribute("data-text");
    const no = fallback.getAttribute("data-no") || (Number(key) + 1);
    const result = selected ? selected.value : "";
    checkItemsObj[key] = !!result;
    checklistTexts[key] = (result ? "[" + result + "] " : "") + text;
    checklistResults.push({ no, text, result });
  });

  const formData = {
    department: dept,
    equipment: document.getElementById("equipment").value,
    idCode: document.getElementById("idCode").value.toUpperCase().trim(),
    deviceIdCode: (document.getElementById("deviceIdCode") ? document.getElementById("deviceIdCode").value.toUpperCase().trim() : ""),
    assetNo: (document.getElementById("assetNo") ? document.getElementById("assetNo").value.trim() : ""),
    date: document.getElementById("date").value,
    inspector: document.getElementById("inspector").value.trim(),
    checkItems: checkItemsObj,
    checklistTexts,
    checklistResults,
    status: document.querySelector('input[name="status"]:checked').value,
    note: (document.getElementById("extra-note") && document.getElementById("extra-note").value.trim()) || document.getElementById("note").value.trim(),
    imageFile: { base64: base64Images[0] ? base64Images[0].base64 : null, type: base64Images[0] ? base64Images[0].type : null },
    imageFiles: base64Images
  };

  // Remember inspector name for next time
  localStorage.setItem("uth_inspector", formData.inspector);

  const submitBtn = document.getElementById("submit-btn");
  const oriHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> กำลังบันทึกข้อมูล...';
  submitBtn.disabled = true;
  lucide.createIcons();

  showLoading("กำลังบันทึกข้อมูลแบบเร็ว...", "กำลังบีบอัดรูปและบันทึกลง Google Sheet / Drive กรุณารอสักครู่");

  try {
    let res = await callAppsScript("save", formData);

    if (res && res.duplicate) {
      const existing = res.existing || {};
      const msg = [
        "พบข้อมูลซ้ำในระบบ",
        "",
        "เงื่อนไขซ้ำ: วันที่ตรวจสอบ + ID CODE + ประเภทเครื่องมือ",
        existing.timestamp ? ("เวลาที่เคยบันทึก: " + existing.timestamp) : "",
        existing.dept ? ("แผนก: " + existing.dept) : "",
        "",
        "ต้องการบันทึกซ้ำต่อหรือไม่?"
      ].filter(Boolean).join("\n");

      if (confirm(msg)) {
        formData.allowDuplicate = true;
        updateLoading("กำลังบันทึกข้อมูลซ้ำ...", "กำลังบันทึกข้อมูลตามที่ยืนยัน กรุณารอสักครู่");
        res = await callAppsScript("save", formData);
      } else {
        resetSubmitButton(oriHtml);
        return;
      }
    }

    if (res && res.success) {
      // FINAL V5.26: log แบบ fire-and-forget ไม่รอให้เสร็จ เพื่อลดเวลาบันทึกหน้าเว็บ
      callAppsScript("log", Object.assign({
        event: "save_check",
        sessionId: window._sessionId || "-",
        userName: formData.inspector || "-",
        page: "form",
        equipment: formData.equipment || "-",
        department: formData.department || "-",
        sn: formData.idCode || "-",
        startTime: new Date().toISOString(),
        userAgent: navigator.userAgent
      }, getCurrentLoginLogInfo())).catch(logErr => console.warn("save_check log failed", logErr));
      showSuccess(formData.idCode);
      globalRawData = [];
    } else {
      alert("Error: " + ((res && res.error) || "บันทึกไม่สำเร็จ"));
      resetSubmitButton(oriHtml);
    }
  } catch (err) {
    alert("บันทึกไม่สำเร็จ: " + err.message);
  } finally {
    hideLoading(true);
    resetSubmitButton(oriHtml);
  }
}

function resetSubmitButton(html) {
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerHTML = html;
  submitBtn.disabled = false;
  lucide.createIcons();
}

function showSuccess(id) {
  document.getElementById("form-page").classList.add("page-hidden");
  document.getElementById("success-page").classList.remove("page-hidden");
  document.getElementById("success-id").innerText = id;
}

function resetFormForNextRecord() {
  document.getElementById("daily-form").reset();
  document.getElementById("date").valueAsDate = new Date();
  document.getElementById("checklist-container").classList.add("hidden");
  document.getElementById("other-dept-container").classList.add("hidden");
  document.getElementById("broken-zone").classList.add("hidden");
  resetImage();
  resetSubmitButton('<i data-lucide="send" class="w-5 h-5"></i> บันทึกข้อมูล');
  switchTab("form");
}


function captureDashboardUiState() {
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
  };
  return {
    date: val("filter-date"),
    year: val("filter-year") || "ALL",
    month: val("filter-month") || "ALL",
    dept: val("filter-dept") || "ALL",
    equip: val("filter-equip") || "ALL",
    status: val("filter-status") || "ALL",
    sn: val("filter-sn") || "",
    dateRangeMode: window._dateRangeMode || null,
    currentPage: currentPage || 1,
    sortCol: currentSortCol,
    sortAsc: sortAsc
  };
}

function setSelectValueKeep(selectId, value) {
  const el = document.getElementById(selectId);
  if (!el) return;
  if (value === undefined || value === null || value === "") return;
  const exists = Array.from(el.options || []).some(o => String(o.value) === String(value));
  el.value = exists ? value : (el.querySelector('option[value="ALL"]') ? "ALL" : "");
}

function restoreDashboardUiState(state) {
  if (!state) return;
  const fDate = document.getElementById("filter-date");
  const fSn = document.getElementById("filter-sn");
  if (fDate) fDate.value = state.date || "";
  if (fSn) fSn.value = state.sn || "";
  setSelectValueKeep("filter-year", state.year || "ALL");
  setSelectValueKeep("filter-month", state.month || "ALL");
  setSelectValueKeep("filter-dept", state.dept || "ALL");
  setSelectValueKeep("filter-equip", state.equip || "ALL");
  setSelectValueKeep("filter-status", state.status || "ALL");
  window._dateRangeMode = state.dateRangeMode || null;
  currentPage = Number(state.currentPage || 1);
  if (state.sortCol) currentSortCol = state.sortCol;
  if (typeof state.sortAsc === "boolean") sortAsc = state.sortAsc;
}

async function loadDashboardData() {
  const dashLoader = document.getElementById("dash-loader");
  if (dashLoader) dashLoader.classList.remove("hidden");
  const keepState = globalRawData && globalRawData.length ? captureDashboardUiState() : null;
  showLoading("กำลังโหลด Dashboard...", "กำลังดึงข้อมูลล่าสุดจาก Google Sheet");

  try {
    const res = await callAppsScript("dashboard");
    if (!res.success) throw new Error(res.error || "โหลดข้อมูลไม่สำเร็จ");
    updateLoading("กำลังจัดรูปแบบข้อมูล...", "กำลังคำนวณสรุปและเตรียมตาราง");
    globalRawData = (res.rows || []).map(normalizeRow);
    globalDeptSettings = res.deptSettings || globalDeptSettings || [];
    initFilters({ keepUserSelection: !!keepState });
    if (keepState) {
      restoreDashboardUiState(keepState);
      applyFilter({ preservePage: true });
    } else {
      applyUserDepartmentFilter();
      applyFilter();
    }
  } catch (err) {
    if (dashLoader) dashLoader.classList.add("hidden");
    alert("โหลด Dashboard ไม่สำเร็จ: " + err.message);
  } finally {
    hideLoading(true);
  }
}

function initFilters(options = {}) {
  const fDate = document.getElementById("filter-date");
  const fYear = document.getElementById("filter-year");
  const fMonth = document.getElementById("filter-month");
  const fDept = document.getElementById("filter-dept");
  const fEquip = document.getElementById("filter-equip");
  const fStatus = document.getElementById("filter-status");

  const years = new Set();
  const months = new Set();
  const depts = new Set(DEPARTMENTS.filter(d => d !== "อื่นๆ"));
  const equips = new Set(EQUIPMENTS);
  globalRawData.forEach(r => {
    const p = dateParts(r);
    if (p.y) years.add(p.y);
    if (p.m) months.add(p.m);
    if (r.dept && r.dept !== "-") depts.add(r.dept);
    if (r.equip && r.equip !== "-") equips.add(r.equip);
  });

  const old = { date: fDate.value, y: fYear.value, m: fMonth.value, d: fDept.value, eq: fEquip.value, s: fStatus.value };

  fYear.innerHTML = '<option value="ALL">ปีทั้งหมด</option>';
  [...years].sort((a,b)=>b-a).forEach(y => fYear.appendChild(new Option(y + 543, y)));
  fMonth.innerHTML = '<option value="ALL">เดือนทั้งหมด</option>';
  [...months].sort((a,b)=>a-b).forEach(m => fMonth.appendChild(new Option(THAI_MONTHS[m-1], m)));
  fDept.innerHTML = '<option value="ALL">แผนกทั้งหมด</option>';
  [...depts].sort().forEach(d => fDept.appendChild(new Option(d, d)));
  fEquip.innerHTML = '<option value="ALL">เครื่องมือทั้งหมด</option>';
  [...equips].forEach(e => fEquip.appendChild(new Option(equipmentShort(e), e)));
  fStatus.innerHTML = '<option value="ALL">สถานะทั้งหมด</option><option value="พร้อมใช้งาน">พร้อมใช้งาน</option><option value="ชำรุด">ชำรุด</option>';

  fDate.value = old.date || "";
  fYear.value = old.y || "ALL";
  fMonth.value = old.m || "ALL";
  fDept.value = old.d || "ALL";
  fEquip.value = old.eq || "ALL";
  fStatus.value = old.s || "ALL";

  if (!options.keepUserSelection) applyUserDepartmentFilter();

  [fDate, fYear, fMonth, fDept, fEquip, fStatus].forEach(el => {
    el.onchange = applyFilter;
  });
  const fSn = document.getElementById("filter-sn");
  if (fSn) fSn.oninput = applyFilter;
}

function clearFilters() {
  document.getElementById("filter-date").value = "";
  const fSn = document.getElementById("filter-sn");
  if (fSn) fSn.value = "";
  ["filter-year", "filter-month", "filter-dept", "filter-equip", "filter-status"].forEach(id => document.getElementById(id).value = "ALL");
  currentPage = 1;
  applyFilter();
}

function setDateRange(range) {
  // Reset other filters
  document.getElementById("filter-date").value = "";
  ["filter-year", "filter-month"].forEach(id => document.getElementById(id).value = "ALL");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Update button styles
  ["btn-range-today", "btn-range-week", "btn-range-month", "btn-range-all"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.className = "px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-all";
    }
  });
  const activeBtn = document.getElementById("btn-range-" + range);
  if (activeBtn) {
    activeBtn.className = "px-3 py-1.5 text-xs font-bold rounded-lg border border-uth-300 bg-uth-50 text-uth-700 hover:bg-uth-100 transition-all";
  }

  if (range === "today") {
    document.getElementById("filter-date").value = today;
  } else if (range === "week") {
    // Set year/month to current, filter will show this week's data
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    document.getElementById("filter-year").value = year;
    // We'll filter by week in applyFilter using dateRangeMode
    window._dateRangeMode = "week";
  } else if (range === "month") {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    document.getElementById("filter-year").value = year;
    document.getElementById("filter-month").value = month;
    window._dateRangeMode = null;
  } else {
    // all
    window._dateRangeMode = null;
  }

  if (range !== "week") {
    window._dateRangeMode = null;
  }

  currentPage = 1;
  applyFilter();
}

function sortTable(col) {
  if (currentSortCol === col) sortAsc = !sortAsc;
  else { currentSortCol = col; sortAsc = true; }
  applyFilter();
}

function applyFilter(options = {}) {
  const showFilterLoading = !options.preservePage && !options.silent;
  if (showFilterLoading) showLoading("กำลังกรองข้อมูล...", "กำลังจัดรายการตามเงื่อนไขที่เลือก");
  if (!options.preservePage) currentPage = 1;
  const selectedDate = document.getElementById("filter-date").value;
  const y = document.getElementById("filter-year").value;
  const m = document.getElementById("filter-month").value;
  const d = document.getElementById("filter-dept").value;
  const eq = document.getElementById("filter-equip").value;
  const s = document.getElementById("filter-status").value;

  const snSearch = (document.getElementById("filter-sn") ? document.getElementById("filter-sn").value : "").trim().toUpperCase();

  let filtered = globalRawData.filter(r => {
    const rowDate = getRowDate(r);
    const p = dateParts(r);
    if (snSearch && ![r.sn, r.deviceIdCode, r.assetNo].some(v => String(v || "").toUpperCase().includes(snSearch))) return false;
    // Week mode filter
    if (window._dateRangeMode === "week" && rowDate) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const rd = new Date(rowDate + "T00:00:00");
      if (rd < startOfWeek || rd > endOfWeek) return false;
    }
    if (selectedDate && rowDate !== selectedDate) return false;
    if (y !== "ALL" && String(p.y) !== String(y)) return false;
    if (m !== "ALL" && String(p.m) !== String(m)) return false;
    if (d !== "ALL" && r.dept !== d) return false;
    if (eq !== "ALL" && r.equip !== eq) return false;
    if (s !== "ALL") {
      if (s === "พร้อมใช้งาน" && !isNormalStatus(r.status)) return false;
      if (s === "ชำรุด" && r.status !== "ชำรุด") return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    let valA = a[currentSortCol] || "";
    let valB = b[currentSortCol] || "";
    if (currentSortCol === "timestamp") { valA = a.rawDate || a.checkDate || ""; valB = b.rawDate || b.checkDate || ""; }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  lastFilteredData = filtered;
  renderDashboard(filtered);
  if (showFilterLoading) setTimeout(() => hideLoading(true), 250);
}


function getKpiReferenceDate() {
  const selected = document.getElementById("filter-date") ? document.getElementById("filter-date").value : "";
  return selected || new Date().toISOString().slice(0, 10);
}

function formatDateForKpi(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}


function normalizeKpiKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）\[\]{}\-_/\\.,:;|]/g, "")
    .replace(/งาน/g, "")
    .trim();
}

function makeNormalizedTargetGroups(settings) {
  const raw = groupDepartmentSettings(settings || []);
  const normalized = {};
  Object.keys(raw).forEach(dept => {
    const key = normalizeKpiKey(dept);
    if (!normalized[key]) normalized[key] = raw[dept];
    else {
      // merge duplicate-like department names
      Object.assign(normalized[key].equipmentTargets, raw[dept].equipmentTargets || {});
      if (!normalized[key].headEmail && raw[dept].headEmail) normalized[key].headEmail = raw[dept].headEmail;
    }
  });
  return { raw, normalized };
}

function findTargetGroupForDept(dept, targetMaps) {
  if (!dept || !targetMaps) return null;
  if (targetMaps.raw && targetMaps.raw[dept]) return targetMaps.raw[dept];
  const key = normalizeKpiKey(dept);
  if (targetMaps.normalized && targetMaps.normalized[key]) return targetMaps.normalized[key];
  return null;
}

function getAllKpiEquipments(targetGroup, actualByEquip) {
  const set = new Set();
  (globalEquipmentList && globalEquipmentList.length ? globalEquipmentList : EQUIPMENTS).forEach(eq => set.add(eq));
  Object.keys((targetGroup && targetGroup.equipmentTargets) || {}).forEach(eq => set.add(eq));
  Object.keys(actualByEquip || {}).forEach(eq => set.add(eq));
  return Array.from(set).filter(Boolean);
}


function renderDepartmentKpiDashboard() {
  const list = document.getElementById("dept-kpi-list");
  const overall = document.getElementById("dept-kpi-overall");
  const label = document.getElementById("dept-kpi-date-label");
  if (!list) return;

  const refDate = getKpiReferenceDate();
  const fDept = document.getElementById("filter-dept");
  const selectedDept = fDept ? fDept.value : "ALL";

  const rowsForDate = (globalRawData || []).filter(r => getRowDate(r) === refDate);
  const targetMaps = makeNormalizedTargetGroups(globalDeptSettings || []);

  let items = [];
  let modeLabel = "";

  if (selectedDept && selectedDept !== "ALL") {
    // Department selected: show ALL equipment list actual / target for that department
    modeLabel = `รายเครื่องมือของแผนก ${selectedDept}`;
    const selectedKey = normalizeKpiKey(selectedDept);
    const actualByEquip = {};

    rowsForDate
      .filter(r => normalizeKpiKey(r.dept || "-") === selectedKey)
      .forEach(r => {
        const eq = r.equip || "-";
        actualByEquip[eq] = (actualByEquip[eq] || 0) + 1;
      });

    const targetGroup = findTargetGroupForDept(selectedDept, targetMaps) || { equipmentTargets: {} };
    const equipTargets = targetGroup.equipmentTargets || {};
    const equipNames = getAllKpiEquipments(targetGroup, actualByEquip);

    items = equipNames.map(eq => ({
      name: eq,
      fullName: eq,
      target: Number(equipTargets[eq] || 0),
      actual: Number(actualByEquip[eq] || 0)
    }));
  } else {
    // All departments: show each department total actual / total target from Daily Summary KPI setting
    modeLabel = "รวมทุกแผนก";
    const actualByKey = {};
    const displayByKey = {};

    rowsForDate.forEach(r => {
      const dept = r.dept || "-";
      const key = normalizeKpiKey(dept);
      actualByKey[key] = (actualByKey[key] || 0) + 1;
      if (!displayByKey[key]) displayByKey[key] = dept;
    });

    const targetKeys = Object.keys(targetMaps.normalized || {});
    const keys = Array.from(new Set([
      ...targetKeys,
      ...Object.keys(actualByKey)
    ])).filter(Boolean);

    items = keys.map(key => {
      const g = (targetMaps.normalized || {})[key] || { department: displayByKey[key] || "-", equipmentTargets: {}, active: true, headEmail: "" };
      const target = Object.values(g.equipmentTargets || {}).reduce((sum, v) => sum + Number(v || 0), 0);
      return {
        name: g.department || displayByKey[key] || "-",
        fullName: g.department || displayByKey[key] || "-",
        target,
        actual: Number(actualByKey[key] || 0),
        active: g.active !== false
      };
    }).filter(x => x.active !== false);
  }

  items.sort((a, b) => (b.actual - a.actual) || a.name.localeCompare(b.name, "th"));

  const totalActual = items.reduce((s, x) => s + Number(x.actual || 0), 0);
  const totalTarget = items.reduce((s, x) => s + Number(x.target || 0), 0);
  const totalPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : (totalActual > 0 ? 100 : 0);
  const maxVal = Math.max(1, ...items.map(x => Math.max(Number(x.actual || 0), Number(x.target || 0))));

  if (label) label.textContent = `Actual vs Target | ${modeLabel} | วันที่ ${formatDateForKpi(refDate)}`;
  if (!items.length) {
    list.innerHTML = `<div class="p-4 text-sm text-slate-500 rounded-2xl bg-slate-50 border border-slate-100">ยังไม่มีข้อมูล KPI สำหรับเงื่อนไขนี้</div>`;
    if (overall) overall.textContent = "รวม 0/- รายการ (0%)";
    return;
  }

  const bars = items.map(item => {
    const actual = Number(item.actual || 0);
    const target = Number(item.target || 0);
    const pct = target > 0 ? Math.round((actual / target) * 100) : (actual > 0 ? 100 : 0);
    const actualH = Math.max(actual > 0 ? 5 : 0, Math.round((actual / maxVal) * 300));
    const targetH = Math.max(target > 0 ? 5 : 0, Math.round((target / maxVal) * 300));
    const title = escapeHTML(item.fullName || item.name);
    const shortName = escapeHTML(item.name || "-");
    const pctText = target > 0 ? pct + "%" : (actual > 0 ? "100%" : "0%");
    return `
      <div class="kpi-bar-group" title="${title}: Actual ${actual} / Target ${target} (${pctText})">
        <div class="kpi-tooltip">
          <b>${title}</b><br>
          Actual: ${actual.toLocaleString()}<br>
          Target: ${target.toLocaleString()}<br>
          Complete: ${pctText}
        </div>
        <div class="kpi-bar-stack">
          <span class="kpi-bar-percent">${pctText}</span>
          <div class="kpi-bar-target" style="height:${targetH}px"></div>
          <div class="kpi-bar-actual" style="height:${actualH}px"></div>
        </div>
        <div class="kpi-dept-label" title="${title}">${shortName}</div>
      </div>`;
  }).join("");

  list.innerHTML = `
    <div class="kpi-legend mb-2">
      <span><i class="kpi-dot target"></i> TARGET</span>
      <span><i class="kpi-dot actual"></i> ACTUAL</span>
    </div>
    <div class="kpi-chart-wrap">
      <div class="kpi-chart">${bars}</div>
    </div>`;

  if (overall) overall.innerHTML = `<span>รวม ${totalActual}/${totalTarget || "-"} รายการ</span><span class="ml-1 text-uth-900">(${totalPct}%)</span>`;
}

function renderDashboard(data) {
  currentDisplayedData = data;
  document.getElementById("dash-loader").classList.add("hidden");
  let normal = 0;
  let broken = 0;
  const equipCount = {};
  const tbody = document.getElementById("dash-table-body");
  tbody.innerHTML = "";

  // Count stats from ALL data (not just current page)
  data.forEach((row) => {
    if (isNormalStatus(row.status)) normal++;
    else if (row.status === "ชำรุด") broken++;
    const eqShort = equipmentShort(row.equip);
    equipCount[eqShort] = (equipCount[eqShort] || 0) + 1;
  });

  renderDepartmentKpiDashboard();

  // Pagination
  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const pageData = data.slice(startIdx, startIdx + ROWS_PER_PAGE);

  pageData.forEach((row, pageIdx) => {
    const globalIdx = startIdx + pageIdx;
    const sHtml = isNormalStatus(row.status)
      ? `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-green-200">พร้อมใช้งาน</span>`
      : `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-red-200">ชำรุด</span>`;
    const eqShort = equipmentShort(row.equip);

    tbody.insertAdjacentHTML("beforeend", `
            <tr onclick="openModalByIndex(${globalIdx})" class="hover:bg-uth-50 transition-colors border-b cursor-pointer">
        <td class="px-3 py-1.5 border-r text-[11px] leading-tight">${escapeHTML(row.timestamp || row.checkDate || "-")}</td>
        <td class="px-3 py-1.5 truncate max-w-[140px] border-r text-[11px] leading-tight" title="${escapeHTML(row.dept || "-")}">${escapeHTML(row.dept || "-")}</td>
        <td class="px-3 py-1.5 border-r text-[11px] leading-tight">${escapeHTML(eqShort)}</td>
        <td class="px-3 py-1.5 font-semibold text-uth-700 border-r text-[11px] leading-tight">${escapeHTML(row.deviceIdCode || "-")}</td>
        <td class="px-3 py-1.5 border-r text-[11px] leading-tight">${escapeHTML(row.sn || "-")}</td>
        <td class="px-3 py-1.5 border-r text-[11px] leading-tight">${escapeHTML(row.assetNo || "-")}</td>
        <td class="px-3 py-1.5 text-center border-r">${sHtml}</td>
        <td class="px-3 py-1.5 truncate max-w-[110px] border-r text-[11px] leading-tight" title="${escapeHTML(row.inspector || '-')}">${escapeHTML(row.inspector || '-')}</td>
        <td class="px-2 py-1.5 text-center">
          <button onclick="event.stopPropagation(); exportSinglePdf(${globalIdx})" class="p-1 hover:bg-uth-50 rounded-lg transition-all group" title="Export PDF"><svg class="w-4 h-4 text-uth-600 group-hover:text-uth-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11v6m0 0l-2-2m2 2l2-2"></path></svg></button>
        </td>
      </tr>
    `);
  });

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-12 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
  }

  document.getElementById("dash-total").innerText = data.length;
  document.getElementById("dash-normal").innerText = normal;
  document.getElementById("dash-broken").innerText = broken;

  // Dept summary
  const deptCount = {};
  data.forEach(r => {
    const dept = r.dept || "-";
    deptCount[dept] = (deptCount[dept] || 0) + 1;
  });
  const deptList = document.getElementById("dept-summary-list");
  if (deptList) {
    const sorted = Object.entries(deptCount).sort((a,b) => b[1] - a[1]);
    deptList.innerHTML = sorted.map(([dept, count]) => `<div class="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-slate-200"><span class="truncate text-slate-700">${escapeHTML(dept)}</span><span class="font-bold text-uth-700 bg-uth-50 px-1.5 rounded">${count}</span></div>`).join("");
  }

  // Update pagination bar
  const pgInfo = document.getElementById("page-info");
  if (pgInfo) pgInfo.innerText = `หน้า ${currentPage}/${totalPages} (${data.length} รายการ)`;

  drawChart(equipCount);
  lucide.createIcons();
}

function drawChart(equipObj) {
  const ctx = document.getElementById("equipChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  const labels = Object.keys(equipObj || {});
  const values = Object.values(equipObj || {});
  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels.length ? labels : ["ไม่มีข้อมูล"],
      datasets: [{ data: values.length ? values : [1], backgroundColor: ["#8a2b84", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#4f46e5", "#15803d", "#ea580c", "#6d28d9", "#0d9488", "#c026d3", "#1d4ed8"], borderWidth: 1 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { family: "Sarabun", size: 9 } } } } }
  });
}


// ============================================================
// DETAIL MODAL: IMAGE GALLERY + EDITABLE PASS/FAIL CHECKLIST
// ============================================================
let _modalEditingRow = null;

function parseChecklistForDetail(row) {
  const equipment = row && (row.equip || row.equipment) || "";
  const raw = String((row && row.checkText) || "").split("\n").map(t => t.trim()).filter(Boolean);
  if (raw.length) {
    return raw.map((line, i) => {
      let text = line.replace(/^-\s*/, "").trim();
      let result = "";
      const m = text.match(/^\[(PASS|FAIL|P|F)\]\s*(.*)$/i);
      if (m) {
        result = /FAIL|F/i.test(m[1]) ? "FAIL" : "PASS";
        text = m[2].trim();
      } else if (/^FAIL\s*[:：-]/i.test(text)) {
        result = "FAIL";
        text = text.replace(/^FAIL\s*[:：-]\s*/i, "");
      } else if (/^PASS\s*[:：-]/i.test(text)) {
        result = "PASS";
        text = text.replace(/^PASS\s*[:：-]\s*/i, "");
      } else {
        result = "PASS";
      }
      text = text.replace(/^\d+[.)]\s*/, "");
      return { no: i + 1, text, result };
    });
  }

  const source = (typeof DYNAMIC_CHECKLISTS !== "undefined" && DYNAMIC_CHECKLISTS[equipment]) ? DYNAMIC_CHECKLISTS[equipment] : [];
  let n = 0;
  return source.filter(item => !item.section).map(item => {
    n++;
    return { no: item.no || n, text: item.text || "", result: "PASS" };
  });
}

function renderModalImageGallery(row) {
  const box = document.getElementById("md-img-box");
  const img = document.getElementById("md-img");
  const link = document.getElementById("md-img-link");
  const collage = document.getElementById("md-img-collage");
  let gallery = document.getElementById("md-img-gallery");

  const imgs = [];
  if (row && Array.isArray(row.imgs)) row.imgs.forEach(u => { if (u && u !== "-") imgs.push(u); });
  if (row && row.img && row.img !== "-" && !imgs.includes(row.img)) imgs.unshift(row.img);

  if (!imgs.length) {
    if (box) box.classList.add("hidden");
    return;
  }

  if (box) box.classList.remove("hidden");
  if (img) img.src = imgs[0];
  if (link) link.href = imgs[0];

  window._modalImageUrls = imgs;

  // Collage view for multiple images
  if (collage) {
    const countClass = imgs.length === 1 ? "count-1" : imgs.length === 2 ? "count-2" : imgs.length === 3 ? "count-3" : imgs.length === 4 ? "count-4" : "count-more";
    collage.className = "uth-collage " + countClass;

    const showImgs = imgs.slice(0, 4);
    collage.innerHTML = showImgs.map((url, i) => {
      const more = (i === 3 && imgs.length > 4) ? `<div class="uth-collage-more">+${imgs.length - 4}</div>` : "";
      return `
        <div class="uth-collage-item">
          <img src="${escapeHTML(url)}" onclick="selectModalImage(${i}); window.open('${escapeHTML(url)}','_blank');" alt="รูปที่ ${i+1}">
          ${more}
        </div>`;
    }).join("");
  }

  // Thumbnail fallback / quick selector
  if (gallery) {
    gallery.classList.toggle("hidden", imgs.length <= 1);
    gallery.innerHTML = imgs.map((url, i) => `
      <button type="button" onclick="selectModalImage(${i})" data-img-url="${escapeHTML(url)}"
        class="md-img-thumb border rounded-xl overflow-hidden bg-white hover:ring-2 hover:ring-uth-500 transition-all ${i === 0 ? "ring-2 ring-uth-500" : ""}">
        <img src="${escapeHTML(url)}" class="w-full h-16 object-cover">
      </button>
    `).join("");
  }
}

function selectModalImage(i) {
  const urls = window._modalImageUrls || [];
  const url = urls[i];
  if (!url) return;
  const img = document.getElementById("md-img");
  const link = document.getElementById("md-img-link");
  if (img) img.src = url;
  if (link) link.href = url;
  document.querySelectorAll(".md-img-thumb").forEach((btn, idx) => {
    btn.classList.toggle("ring-2", idx === i);
    btn.classList.toggle("ring-uth-500", idx === i);
  });
}

function detailChecklistPair(input) {
  const row = input.closest(".md-check-row");
  if (!row) return;
  row.querySelectorAll(".md-check-input").forEach(el => {
    if (el !== input) el.checked = false;
  });
  const saveRow = document.getElementById("md-check-save-row");
  if (saveRow) saveRow.classList.remove("hidden");
}

function renderEditableModalChecklist(row) {
  const target = document.getElementById("md-check");
  const saveRow = document.getElementById("md-check-save-row");
  if (!target) return;
  const items = parseChecklistForDetail(row);

  if (!items.length) {
    target.innerHTML = `<div class="text-slate-400">-</div>`;
    if (saveRow) saveRow.classList.add("hidden");
    return;
  }

  target.innerHTML = `
    <div class="space-y-2">
      ${items.map((item, idx) => {
        const result = String(item.result || "PASS").toUpperCase();
        return `
          <div class="md-check-row grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2 items-center bg-white border border-slate-200 rounded-xl px-3 py-2"
            data-no="${escapeHTML(item.no || idx + 1)}" data-text="${escapeHTML(item.text || "")}">
            <div class="font-medium text-slate-700 leading-snug">${escapeHTML(item.no || idx + 1)}. ${escapeHTML(item.text || "")}</div>
            <div class="flex gap-3 justify-start sm:justify-end whitespace-nowrap">
              <label class="inline-flex items-center gap-1 text-xs font-bold text-green-700 cursor-pointer">
                <input type="checkbox" class="md-check-input" value="PASS" ${result !== "FAIL" ? "checked" : ""} onchange="detailChecklistPair(this)"> PASS
              </label>
              <label class="inline-flex items-center gap-1 text-xs font-bold text-red-700 cursor-pointer">
                <input type="checkbox" class="md-check-input" value="FAIL" ${result === "FAIL" ? "checked" : ""} onchange="detailChecklistPair(this)"> FAIL
              </label>
            </div>
          </div>`;
      }).join("")}
    </div>
  `;
  if (saveRow) saveRow.classList.add("hidden");
}

async function saveModalChecklistEdits() {
  if (!_modalEditingRow) {
    alert("ไม่พบข้อมูลรายการที่ต้องการแก้ไข");
    return;
  }

  const checklistResults = Array.from(document.querySelectorAll("#md-check .md-check-row")).map((row, idx) => {
    const selected = row.querySelector(".md-check-input:checked");
    return {
      no: row.getAttribute("data-no") || (idx + 1),
      text: row.getAttribute("data-text") || "",
      result: selected ? selected.value : "PASS"
    };
  });

  if (!confirm("ยืนยันการแก้ไขรายการ Checklist ใช่หรือไม่?")) return;

  showLoading("กำลังบันทึก Checklist...", "กำลังอัปเดตรายการตรวจสอบใน Google Sheet");
  try {
    const res = await callAppsScript("updateChecklist", {
      date: _modalEditingRow.checkDate || _modalEditingRow.date || "",
      idCode: _modalEditingRow.sn || "",
      equipment: _modalEditingRow.equip || "",
      timestamp: _modalEditingRow.timestamp || "",
      checklistResults
    });

    if (!res || !res.success) {
      alert("แก้ไข Checklist ไม่สำเร็จ: " + ((res && res.error) || "Unknown error"));
      return;
    }

    const newText = checklistResults.map(item => `[${String(item.result || "PASS").toUpperCase()}] ${item.no}. ${item.text}`).join("\n");
    _modalEditingRow.checkText = newText;
    renderEditableModalChecklist(_modalEditingRow);
    const saveRow = document.getElementById("md-check-save-row");
    if (saveRow) saveRow.classList.add("hidden");
    alert("บันทึกการแก้ไข Checklist สำเร็จ");
    globalRawData = [];
  } catch (err) {
    alert("แก้ไข Checklist ไม่สำเร็จ: " + err.message);
  } finally {
    hideLoading(true);
  }
}

function openModalByIndex(i) {
  const row = currentDisplayedData[i];
  if (!row) return;
  _modalEditingRow = row;

  document.getElementById("md-time").innerText = row.timestamp || row.checkDate || "-";
  document.getElementById("md-sn").innerText = row.deviceIdCode || "-";
  const mdDeviceId = document.getElementById("md-device-id");
  if (mdDeviceId) mdDeviceId.innerText = row.sn || "-";
  const mdAssetNo = document.getElementById("md-asset-no");
  if (mdAssetNo) mdAssetNo.innerText = row.assetNo || "-";
  document.getElementById("md-equip").innerText = row.equip || "-";
  document.getElementById("md-dept").innerText = row.dept || "-";
  document.getElementById("md-inspector").innerText = row.inspector || "-";
  document.getElementById("md-status").innerHTML = isNormalStatus(row.status)
    ? `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-green-200">พร้อมใช้งาน</span>`
    : `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-red-200">ชำรุด</span>`;

  if (row.note && row.note !== "-") {
    document.getElementById("md-note-box").classList.remove("hidden");
    document.getElementById("md-note").innerText = row.note;
  } else {
    document.getElementById("md-note-box").classList.add("hidden");
  }

  renderEditableModalChecklist(row);
  renderModalImageGallery(row);

  document.getElementById("detail-modal").style.display = "flex";
  lucide.createIcons();
}

function closeModal() {
  document.getElementById("detail-modal").style.display = "none";
}

function thaiDateLong(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getReportDateLabel(rows) {
  const filterDate = document.getElementById("filter-date").value;
  if (filterDate) return thaiDateLong(filterDate);
  const firstDate = rows[0] ? getRowDate(rows[0]) : "";
  return firstDate ? thaiDateLong(firstDate) : thaiDateLong(new Date().toISOString().slice(0,10));
}

function openPdfPreview() {
  showLoading("กำลังสร้าง Preview PDF...", "กำลังจัดหน้าเอกสารรายงาน");
  setTimeout(() => hideLoading(true), 700);
  if (!lastFilteredData || lastFilteredData.length === 0) {
    alert("ไม่พบข้อมูลสำหรับ Export PDF กรุณาเลือก Filter หรือโหลด Dashboard ก่อน");
    return;
  }
  renderPdfTemplate(lastFilteredData);
  document.getElementById("pdf-modal").style.display = "flex";
  lucide.createIcons();
}

function closePdfPreview() {
  document.getElementById("pdf-modal").style.display = "none";
}


function parseReportChecklistItems(row) {
  const equipment = row.equip || row.equipment || "";
  const raw = (row.checkText || "").split("\n").map(t => t.trim()).filter(Boolean);
  if (raw.length) {
    return raw.map((line, i) => {
      let text = line.replace(/^-\s*/, "").trim();
      let result = "";
      const m = text.match(/^\[(PASS|FAIL|P|F)\]\s*(.*)$/i);
      if (m) {
        result = /FAIL|F/i.test(m[1]) ? "FAIL" : "PASS";
        text = m[2].trim();
      } else if (/^FAIL\s*[:：-]/i.test(text)) {
        result = "FAIL";
        text = text.replace(/^FAIL\s*[:：-]\s*/i, "");
      } else if (/^PASS\s*[:：-]/i.test(text)) {
        result = "PASS";
        text = text.replace(/^PASS\s*[:：-]\s*/i, "");
      } else {
        result = "PASS";
      }
      text = text.replace(/^\d+[.)]\s*/, "");
      return { no: i + 1, text, result };
    });
  }

  const source = (typeof DYNAMIC_CHECKLISTS !== "undefined" && DYNAMIC_CHECKLISTS[equipment]) ? DYNAMIC_CHECKLISTS[equipment] : [];
  let n = 0;
  return source.map(item => {
    if (item.section) return { section: item.section };
    n++;
    return { no: item.no || n, text: item.text || "", result: "" };
  });
}

function dateToThaiSlash(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear() + 543}`;
}

function reportDocNo(equip) {
  const s = (equip || "").toLowerCase();
  if (s.includes("defibrillator")) return "UTH-CME-DC-DEF";
  if (s.includes("syringe")) return "UTH-CME-DC-SYR";
  if (s.includes("infusion")) return "UTH-CME-DC-INF";
  if (s.includes("ventilator")) return "UTH-CME-DC-VENT";
  if (s.includes("aed")) return "UTH-CME-DC-AED";
  if (s.includes("monitor")) return "UTH-CME-DC-MON";
  if (s.includes("ecg") || s.includes("ekg")) return "UTH-CME-DC-ECG";
  if (s.includes("oximeter")) return "UTH-CME-DC-SPO2";
  return "UTH-CME-DC-GEN";
}

function officialReportPage(row, pageNo, totalPages) {
  const cfg = window.DAILY_CHECK_CONFIG || {};
  const equip = row.equip || row.equipment || "";
  const items = parseReportChecklistItems(row);
  const itemRows = items.map((item) => {
    if (item.section) {
      return `<tr><td class="section" colspan="5">${escapeHTML(item.section)}</td></tr>`;
    }
    const pass = String(item.result || "").toUpperCase() === "PASS";
    const fail = String(item.result || "").toUpperCase() === "FAIL";
    return `<tr>
      <td class="no">${escapeHTML(item.no || "")}</td>
      <td class="item">${escapeHTML(item.text || "")}</td>
      <td class="pf"><span class="box">${pass ? "✓" : ""}</span></td>
      <td class="pf"><span class="box">${fail ? "✕" : ""}</span></td>
      <td class="note"></td>
    </tr>`;
  }).join("");

  return `
    <section class="uth-old-report-page">
      <div class="r-header">
        ${cfg.LOGO_URL ? `<img class="r-logo" src="${escapeHTML(cfg.LOGO_URL)}">` : ""}
        <div class="r-hospital">${escapeHTML(cfg.HOSPITAL_NAME || "โรงพยาบาลอุทัยธานี")}</div>
        <div class="r-title-main">ใบรายงานการตรวจเช็คเครื่องมือแพทย์</div>
        <div class="r-title-sub">ใบรายงานการตรวจเช็คเครื่องมือแพทย์ (${escapeHTML(equipmentShort(equip))})</div>
      </div>

      <div class="r-info-grid">
        <div><b>แผนก</b><span>${escapeHTML(row.dept || "-")}</span></div>
        <div><b>วันที่ตรวจ</b><span>${escapeHTML(dateToThaiSlash(row.checkDate || row.date))}</span></div>
        <div><b>หมายเลขครุภัณฑ์</b><span>${escapeHTML(row.assetNo || "-")}</span></div>
        <div><b>ID Code</b><span>${escapeHTML(row.sn || "-")}</span></div>
        <div><b>SN</b><span>${escapeHTML(row.sn || "-")}</span></div>
      </div>

      <table class="r-table">
        <thead>
          <tr>
            <th class="no">No.</th>
            <th class="item">รายการตรวจสอบ</th>
            <th class="pf">PASS</th>
            <th class="pf">FAIL</th>
            <th class="note">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="r-defect-title">หมายเหตุ / อาการชำรุด :-</div>
      <div class="r-dotline"></div>
      <div class="r-dotline"></div>

      <div class="r-sign-grid">
        <div class="r-sign-box">
          <div class="r-sign-line"></div>
          <div>(${escapeHTML(row.inspector || localStorage.getItem("uth_inspector") || "................................................")})</div>
          <b>ผู้ตรวจสอบ</b>
        </div>
        <div class="r-sign-box">
          <div class="r-sign-line"></div>
          <div>(................................................)</div>
          <b>หัวหน้าแผนก</b>
        </div>
      </div>

      <div class="r-note-grid">
        <div>หมายเหตุ : ให้ทำเครื่องหมาย ✓ = ปกติ, ✕ = ผิดปกติ, N/A = กรณีไม่มี Function</div>
        <div>หมายเหตุ : กรณีที่เครื่องไม่ได้ใช้งานให้ตรวจสอบรายสัปดาห์</div>
      </div>

      <div class="r-footer">
        <span>กลุ่มงานโครงสร้างพื้นฐานและวิศวกรรมทางการแพทย์ (ศูนย์เครื่องมือแพทย์) โรงพยาบาลอุทัยธานี</span>
        <span>เลขที่เอกสาร: ${reportDocNo(equip)} &nbsp; Rev. 00</span>
      </div>
    </section>`;
}

function renderPdfTemplate(rows) {
  const pages = (rows && rows.length ? rows : [{}]).map((row, idx) => officialReportPage(row, idx + 1, rows.length)).join("");

  document.getElementById("pdf-template").innerHTML = `
    <style>
      #pdf-template {
        width: 1120px;
        background: white;
        font-family: "Sarabun", "TH Sarabun New", Tahoma, Arial, sans-serif;
        color: #111;
      }
      .uth-old-report-page {
        width: 1120px;
        height: 790px;
        box-sizing: border-box;
        background: #fff;
        padding: 28px 36px 22px 36px;
        page-break-after: always;
        overflow: hidden;
      }
      .uth-old-report-page:last-child { page-break-after: auto; }
      .r-header { text-align: center; line-height: 1.18; margin-bottom: 14px; }
      .r-logo { width: 54px; height: 54px; object-fit: contain; display: block; margin: 0 auto 4px auto; }
      .r-hospital { font-size: 14px; font-weight: 900; }
      .r-title-main { font-size: 13px; font-weight: 800; margin-top: 2px; }
      .r-title-sub { font-size: 13px; font-weight: 900; margin-top: 12px; }
      .r-info-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr;
        gap: 5px 24px;
        font-size: 11px;
        margin-bottom: 8px;
      }
      .r-info-grid div { border-bottom: 1px dotted #111; min-height: 20px; display: flex; align-items: flex-start; gap: 8px; }
      .r-info-grid b { white-space: nowrap; font-weight: 900; }
      .r-info-grid span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .r-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
      .r-table th, .r-table td { border: 1px solid #111; padding: 3px 5px; vertical-align: middle; line-height: 1.15; }
      .r-table th { background: #e6e6e6; text-align: center; font-weight: 900; }
      .r-table .no { width: 34px; text-align: center; }
      .r-table .pf { width: 42px; text-align: center; }
      .r-table .note { width: 90px; }
      .r-table .section { background: #bfcbd9; font-weight: 900; text-align: center; }
      .box { display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1px solid #111; line-height: 1; font-size: 10px; font-weight: 900; }
      .r-defect-title { font-size: 10px; font-weight: 900; margin-top: 8px; }
      .r-dotline { height: 22px; border-bottom: 1px dotted #111; }
      .r-sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 9px; }
      .r-sign-box { border: 1px solid #111; height: 58px; text-align: center; font-size: 10px; display: flex; flex-direction: column; justify-content: flex-end; padding: 6px; box-sizing: border-box; }
      .r-sign-line { border-bottom: 1px dotted #111; height: 14px; margin-bottom: 3px; }
      .r-note-grid { display: grid; grid-template-columns: 1.35fr 1fr; margin-top: 8px; font-size: 9px; text-align: center; }
      .r-note-grid div { background: #dbe8f6; border: 1px solid #111; padding: 5px; }
      .r-footer { display: flex; justify-content: space-between; font-size: 8px; margin-top: 10px; }
    </style>
    ${pages}
  `;
}

async function downloadPdf() {
  showLoading("กำลังสร้าง PDF...", "กำลังประมวลผลรายงาน กรุณารอสักครู่");
  const btn = document.getElementById("btn-download-pdf");
  const old = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังสร้าง PDF...';
  btn.disabled = true;
  lucide.createIcons();

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("l", "mm", "a4");
    const pages = Array.from(document.querySelectorAll("#pdf-template .uth-old-report-page"));
    if (!pages.length) throw new Error("ไม่พบหน้ารายงาน");

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 1120,
        height: 790,
        windowWidth: 1120,
        windowHeight: 790
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      if (i > 0) pdf.addPage("a4", "landscape");
      pdf.addImage(imgData, "JPEG", 0, 0, 297, 210, undefined, "FAST");
    }

    const first = (lastFilteredData && lastFilteredData[0]) ? lastFilteredData[0] : {};
    const reportDate = document.getElementById("filter-date").value || first.checkDate || new Date().toISOString().slice(0, 10);
    pdf.save(`Daily_Check_Report_${reportDate}.pdf`);
  } catch (err) {
    alert("สร้าง PDF ไม่สำเร็จ: " + err.message);
  } finally {
    hideLoading(true);
    btn.innerHTML = old;
    btn.disabled = false;
    lucide.createIcons();
  }
}

// ==========================================
// CLOCK / TIMESTAMP
// ==========================================
function startClock() {
  function tick() {
    const now = new Date();
    const dateEl = document.getElementById("clock-date");
    const timeEl = document.getElementById("clock-time");
    if (dateEl) dateEl.innerText = now.toLocaleDateString("th-TH", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    if (timeEl) timeEl.innerText = now.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  }
  tick();
  setInterval(tick, 1000);
}

// ==========================================
// ACCESS LOG
// ==========================================
async function logPageVisit() {
  try {
    const sessionId = window._sessionId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    window._sessionId = sessionId;
    window._sessionStart = new Date();

    const userName = localStorage.getItem("uth_inspector") || "-";
    const loginInfo = getCurrentLoginLogInfo();

    await callAppsScript("log", Object.assign({
      event: "page_visit",
      sessionId: sessionId,
      userName: userName,
      page: document.getElementById("dashboard-page") && !document.getElementById("dashboard-page").classList.contains("page-hidden") ? "dashboard" : "form",
      startTime: window._sessionStart.toISOString(),
      userAgent: navigator.userAgent
    }, loginInfo));
  } catch(e) { /* silent */ }
}

// Track session duration - send on page unload
function logPageLeave() {
  if (!window._sessionStart || !window._sessionId) return;
  const now = new Date();
  const durationSec = Math.round((now - window._sessionStart) / 1000);
  const userName = localStorage.getItem("uth_inspector") || "-";

  // Use sendBeacon for reliable delivery on page close
  const appsScriptUrl = window.DAILY_CHECK_CONFIG && window.DAILY_CHECK_CONFIG.APPS_SCRIPT_URL;
  const isDisabledLocalSample = !appsScriptUrl || appsScriptUrl.includes("PASTE_APPS_SCRIPT");
  if (isDisabledLocalSample) return;

  const payload = JSON.stringify({
    action: "log",
    data: Object.assign({
      event: "page_leave",
      sessionId: window._sessionId,
      userName: userName,
      page: document.getElementById("dashboard-page") && !document.getElementById("dashboard-page").classList.contains("page-hidden") ? "dashboard" : "form",
      startTime: window._sessionStart.toISOString(),
      endTime: now.toISOString(),
      duration: durationSec,
      userAgent: navigator.userAgent
    }, getCurrentLoginLogInfo())
  });

  navigator.sendBeacon(appsScriptUrl, payload);
}

window.addEventListener("beforeunload", logPageLeave);
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") logPageLeave();
});

// ==========================================
// PAGINATION
// ==========================================
function goPage(dir) {
  const totalPages = Math.ceil((lastFilteredData || []).length / ROWS_PER_PAGE);
  if (dir === 'next' && currentPage < totalPages) currentPage++;
  else if (dir === 'prev' && currentPage > 1) currentPage--;
  renderDashboard(lastFilteredData);
}


// ============================================================
// AUTO RESYNC DASHBOARD EVERY 1 MINUTE
// ============================================================
const DASHBOARD_RESYNC_MS = 60 * 1000;
let dashboardResyncTimer = null;
let dashboardIsSyncing = false;

function isDashboardVisible() {
  const dash = document.getElementById("dashboard-page");
  return dash && !dash.classList.contains("page-hidden");
}

async function resyncDashboardDataSilent() {
  if (dashboardIsSyncing || !isDashboardVisible()) return;
  dashboardIsSyncing = true;
  const keepState = captureDashboardUiState();

  try {
    const res = await callAppsScript("dashboard");
    if (!res || !res.success) return;

    globalRawData = (res.rows || []).map(normalizeRow);
    globalDeptSettings = res.deptSettings || globalDeptSettings || [];
    initFilters({ keepUserSelection: true });
    restoreDashboardUiState(keepState);
    applyFilter({ preservePage: true });
  } catch (e) {
    console.warn("Auto resync dashboard failed:", e);
  } finally {
    dashboardIsSyncing = false;
  }
}

function startDashboardAutoResync() {
  if (dashboardResyncTimer) clearInterval(dashboardResyncTimer);
  dashboardResyncTimer = setInterval(resyncDashboardDataSilent, DASHBOARD_RESYNC_MS);
}

// ==========================================
// EXPORT SINGLE PDF (per equipment row)
// ==========================================
function exportSinglePdf(idx) {
  showLoading("กำลังสร้าง Preview PDF...", "กำลังจัดหน้าเอกสารรายงาน");
  setTimeout(() => hideLoading(true), 700);
  const row = lastFilteredData[idx];
  if (!row) return;
  renderPdfTemplate([row]);
  document.getElementById("pdf-modal").style.display = "flex";
  lucide.createIcons();
}

// ==========================================
// EXPORT ALL PDF
// ==========================================
function exportAllPdf() {
  if (!lastFilteredData || lastFilteredData.length === 0) {
    alert("ไม่พบข้อมูลสำหรับ Export กรุณาโหลด Dashboard ก่อน");
    return;
  }
  renderPdfTemplate(lastFilteredData);
  document.getElementById("pdf-modal").style.display = "flex";
  lucide.createIcons();
}

// Export All to Excel (CSV)
function exportAllExcel() {
  showLoading("กำลังสร้างไฟล์ Excel...", "กำลังเตรียมข้อมูลสำหรับดาวน์โหลด");
  setTimeout(() => hideLoading(true), 650);
  if (!lastFilteredData || lastFilteredData.length === 0) {
    alert("ไม่พบข้อมูลสำหรับ Export");
    return;
  }
  const headers = ["No", "วันที่เวลา", "แผนก", "ประเภทเครื่องมือ", "ID CODE", "รหัสเครื่อง/SN", "หมายเลขครุภัณฑ์", "สถานะ", "ผู้ตรวจสอบ", "หมายเหตุ", "รายการ Checklist"];
  const csvRows = [headers.join(",")];
  lastFilteredData.forEach((r, i) => {
    const row = [
      i + 1,
      '"' + (r.timestamp || r.checkDate || "-") + '"',
      '"' + (r.dept || "-") + '"',
      '"' + (equipmentShort(r.equip) || "-") + '"',
      '"' + (r.deviceIdCode || "-") + '"',
      '"' + (r.sn || "-") + '"',
      '"' + (r.assetNo || "-") + '"',
      '"' + (isNormalStatus(r.status) ? "พร้อมใช้งาน" : "ชำรุด") + '"',
      '"' + (r.inspector || "-") + '"',
      '"' + (r.note || "-").replace(/"/g, '""') + '"',
      '"' + (r.checkText || "-").replace(/"/g, '""').replace(/\n/g, " | ") + '"'
    ];
    csvRows.push(row.join(","));
  });
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const reportDate = document.getElementById("filter-date").value || new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = "Daily_Check_Export_" + reportDate + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  showLoading("กำลังสร้าง Template Excel...", "กำลังเตรียมไฟล์ Template");
  setTimeout(() => hideLoading(true), 650);
  const filterEquip = document.getElementById("filter-equip") ? document.getElementById("filter-equip").value : "ALL";
  let items = [];
  let equipName = "เครื่องมือแพทย์";
  if (filterEquip !== "ALL" && DYNAMIC_CHECKLISTS[filterEquip]) {
    items = DYNAMIC_CHECKLISTS[filterEquip];
    equipName = equipmentShort(filterEquip);
  }
  
  // Generate CSV (Excel-compatible with BOM for Thai)
  const BOM = "\uFEFF";
  let csv = BOM;
  csv += "ใบสรุปรายงานการตรวจเช็คเครื่องมือแพทย์ประจำเดือน\n";
  csv += '"หน่วยงาน:",,,"ประจำเดือน:",,,"พ.ศ.:",\n\n';
  
  // Headers: No, รายการเครื่องมือ, Pass, Fail, 1-31
  let header = "No.,รายการเครื่องมือ,Pass,Fail";
  for (let d = 1; d <= 31; d++) header += "," + d;
  csv += header + "\n";
  
  // Rows
  if (items.length > 0) {
    let no = 0;
    items.forEach(item => {
      if (item.section) {
        csv += ',"' + (item.section || '').replace(/"/g, '""') + '"\n';
      } else {
        no++;
        csv += no + ',"' + (item.text || '').replace(/"/g, '""') + '"';
        csv += ",,"; // Pass, Fail empty
        for (let d = 1; d <= 31; d++) csv += ",";
        csv += "\n";
      }
    });
  } else {
    for (let i = 1; i <= 18; i++) {
      csv += i + ",";
      csv += ",,";
      for (let d = 1; d <= 31; d++) csv += ",";
      csv += "\n";
    }
  }
  
  csv += '\n"ผู้ทำความสะอาด ลงชื่อ"\n';
  csv += '"ผู้ตรวจเช็ค (ผู้ใช้) ลงชื่อ"\n';
  csv += '"ศูนย์เครื่องมือแพทย์ หรือผู้มีหน้าที่ติดตามกำกับ รับรองการตรวจเช็ค"\n';
  csv += '\n"หมายเหตุ : ✓ = ปกติ, ✗ = ผิดปกติ, N/A = กรณีไม่มี Function"\n';
  csv += '"หมายเหตุ : กรณีที่เครื่องไม่ได้ใช้งานให้ตรวจสอบรายสัปดาห์"\n';
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_" + equipName.replace(/[\s/]/g, "_") + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
function openMonthlySummary() {
  showLoading("กำลังสร้างรายงานรายเดือน...", "กำลังประมวลผลข้อมูลประจำเดือน");
  setTimeout(() => hideLoading(true), 900);
  if (!lastFilteredData || lastFilteredData.length === 0) {
    alert("ไม่พบข้อมูล กรุณาเลือกเดือนใน Filter ก่อน");
    return;
  }

  const filterMonth = document.getElementById("filter-month").value;
  const filterYear = document.getElementById("filter-year").value;
  const filterDept = document.getElementById("filter-dept").value;
  const now = new Date();
  const month = filterMonth !== "ALL" ? Number(filterMonth) : now.getMonth() + 1;
  const year = filterYear !== "ALL" ? Number(filterYear) : now.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  const deptText = filterDept !== "ALL" ? filterDept : "ทุกแผนก";
  const inspectorName = localStorage.getItem("uth_inspector") || "-";

  const THAI_MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const monthName = THAI_MONTHS_FULL[month - 1];
  const yearBE = year + 543;

  // Group by equipment+SN
  const groups = {};
  lastFilteredData.forEach(r => {
    const key = String(equipmentShort(r.equip) || "-") + "|" + String(r.sn || "-");
    if (!groups[key]) groups[key] = {};
    let day = 0;
    const rd = getRowDate(r);
    if (rd) {
      const d = new Date(rd + "T00:00:00");
      if (!isNaN(d.getTime())) day = d.getDate();
    }
    if (!day && r.timestamp) {
      const match = String(r.timestamp).match(/^(\d{1,2})\//);
      if (match) day = parseInt(match[1]);
    }
    if (day > 0 && day <= 31) {
      groups[key][day] = r.status;
    }
  });

  // Build day headers
  let dayHeaders = '';
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders += '<th style="border:1px solid #000;padding:2px;text-align:center;width:20px;font-size:9px;">' + d + '</th>';
  }

  // Table header with Pass/Fail
  const tableHeader = '<tr><th style="border:1px solid #000;padding:3px;background:#f1f5f9;width:30px;font-size:10px;">No.</th><th style="border:1px solid #000;padding:3px;background:#f1f5f9;min-width:100px;font-size:10px;">รายการเครื่องมือ</th><th style="border:1px solid #000;padding:3px;background:#f1f5f9;width:32px;font-size:10px;">Pass</th><th style="border:1px solid #000;padding:3px;background:#f1f5f9;width:32px;font-size:10px;">Fail</th>' + dayHeaders + '</tr>';

  // Build body rows
  let bodyRows = '';
  let rowNum = 0;
  Object.entries(groups).forEach(([key, days]) => {
    rowNum++;
    const [equip, sn] = key.split("|");
    // Count pass/fail
    let pc = 0, fc = 0;
    for (let d = 1; d <= daysInMonth; d++) { if (days[d]) { if (isNormalStatus(days[d])) pc++; else fc++; } }
    let cells = '<td style="border:1px solid #000;padding:3px;text-align:center;font-size:11px;">' + rowNum + '</td>';
    cells += '<td style="border:1px solid #000;padding:3px;font-size:11px;">' + escapeHTML(equipmentShort(equip)) + '</td>';
    cells += '<td style="border:1px solid #000;padding:3px;text-align:center;font-size:11px;color:#059669;font-weight:bold;">' + (fc === 0 && pc > 0 ? '✓' : '') + '</td>';
    cells += '<td style="border:1px solid #000;padding:3px;text-align:center;font-size:11px;color:#dc2626;font-weight:bold;">' + (fc > 0 ? '✗' : '') + '</td>';
    for (let d = 1; d <= daysInMonth; d++) {
      const status = days[d];
      let symbol = '';
      let clr = '';
      if (status) {
        if (isNormalStatus(status)) { symbol = '✓'; clr = 'color:#059669;'; } else { symbol = '✗'; clr = 'color:#dc2626;'; }
      }
      cells += '<td style="border:1px solid #000;text-align:center;font-size:9px;padding:1px;' + clr + '">' + symbol + '</td>';
    }
    bodyRows += '<tr>' + cells + '</tr>';
  });

  const cfg = window.DAILY_CHECK_CONFIG || {};

  const modalHtml = `
    <div class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-auto" id="monthly-modal" onclick="if(event.target===this)this.remove()">
      <div class="bg-white w-full max-w-[98vw] my-4 shadow-2xl rounded-lg overflow-hidden">
        <div class="bg-gradient-to-r from-uth-800 to-uth-600 text-white px-6 py-3 flex justify-between items-center sticky top-0 z-10">
          <h2 class="text-sm font-bold">ใบสรุปรายงานการตรวจเช็คเครื่องมือแพทย์ ประจำเดือน${monthName} ${yearBE}</h2>
          <div class="flex gap-2">
            <button onclick="exportMonthlyPdf()" class="px-3 py-1.5 bg-white text-uth-700 rounded-lg text-xs font-bold flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> Export PDF</button>
            <button onclick="document.getElementById('monthly-modal').remove()" class="text-white hover:bg-white/20 rounded-full p-1.5">✕</button>
          </div>
        </div>
        <div id="monthly-pdf-content" style="padding:24px;background:white;font-family:Sarabun,sans-serif;color:#000;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            ${cfg.LOGO_URL ? '<img src="' + cfg.LOGO_URL + '" style="width:56px;height:56px;object-fit:contain;">' : ''}
            <div>
              <div style="font-size:16px;font-weight:700;">ใบสรุปรายงานการตรวจเช็คเครื่องมือแพทย์ประจำเดือน</div>
              <div style="font-size:13px;">${escapeHTML(cfg.HOSPITAL_NAME || 'โรงพยาบาลอุทัยธานี')}</div>
            </div>
            <div style="margin-left:auto;text-align:right;font-size:11px;">
              <div>วันที่พิมพ์: ${formatDateTime(new Date())}</div>
            </div>
          </div>

          <p style="font-size:12px;margin-bottom:10px;">หน่วยงาน <b>${escapeHTML(deptText)}</b> ประจำเดือน <b>${monthName}</b> พ.ศ. <b>${yearBE}</b></p>

          <table style="border-collapse:collapse;width:100%;margin-bottom:14px;">
            <thead>
              <tr>
                <th style="border:1px solid #000;padding:3px;text-align:center;width:30px;font-size:10px;background:#f1f1f1;">No.</th>
                <th style="border:1px solid #000;padding:3px;font-size:10px;background:#f1f1f1;min-width:100px;">รายการเครื่องมือ</th>
                <th style="border:1px solid #000;padding:3px;font-size:10px;background:#f1f1f1;width:35px;text-align:center;">Pass</th>
                <th style="border:1px solid #000;padding:3px;font-size:10px;background:#f1f1f1;width:35px;text-align:center;">Fail</th>
                ${dayHeaders}
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>

          <table style="border-collapse:collapse;width:100%;margin-top:14px;">
            <tr>
              <th style="border:1px solid #000;padding:6px;width:33%;font-size:11px;">ผู้ตรวจเช็ค / ผู้ใช้งาน</th>
              <th style="border:1px solid #000;padding:6px;width:33%;font-size:11px;">ศูนย์เครื่องมือแพทย์ / ผู้กำกับติดตาม</th>
              <th style="border:1px solid #000;padding:6px;width:33%;font-size:11px;">ผู้รับรองรายงาน</th>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:10px 6px;height:50px;font-size:11px;vertical-align:bottom;text-align:center;">ลงชื่อ ................................................<br>(${escapeHTML(inspectorName)})</td>
              <td style="border:1px solid #000;padding:10px 6px;height:50px;font-size:11px;vertical-align:bottom;text-align:center;">ลงชื่อ ................................................</td>
              <td style="border:1px solid #000;padding:10px 6px;height:50px;font-size:11px;vertical-align:bottom;text-align:center;">ลงชื่อ ................................................</td>
            </tr>
          </table>

          <p style="font-size:10px;margin-top:10px;color:#333;">หมายเหตุ : ให้ทำเครื่องหมาย ✓ = ปกติ/ผ่าน, ✗ = ผิดปกติ/ไม่ผ่าน, ว่าง = ไม่ได้ตรวจ<br>หมายเหตุ : กรณีที่เครื่องไม่ได้ใช้งานให้ตรวจสอบรายสัปดาห์</p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function exportMonthlyPdf() {
  const element = document.getElementById("monthly-pdf-content");
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save("Monthly_Summary_" + new Date().toISOString().slice(0,7) + ".pdf");
  } catch(err) {
    alert("Export PDF ไม่สำเร็จ: " + err.message);
  }
}
