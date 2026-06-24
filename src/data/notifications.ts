export type NotificationItem = {
  id: string
  tab: "service" | "platform" | "personal"
  title: string
  snippet: string
  time: string
  unread?: boolean
  icon: string
  iconColor: string
}

export const notifications: NotificationItem[] = [
  {
    id: "1",
    tab: "service",
    title: "ทีมพอร์ตลูกค้า: คำขอสนับสนุนของคุณได้รับการตอบกลับ",
    snippet: "เราได้รับรายละเอียดเกี่ยวกับปัญหาการเข้าสู่ระบบของคุณแล้ว และได้ทำการรีเซ็ตสถานะบัญชีให้เรียบร้อย...",
    time: "ตอนนี้",
    unread: true,
    icon: "fa-headset",
    iconColor: "#4361EE",
  },
  {
    id: "5",
    tab: "service",
    title: "การนัดหมายสนทนากับผู้เชี่ยวชาญ",
    snippet: "วันนี้เวลา 15:00 น. คุณมีนัดหมายวิดีโอคอลเพื่อรับคำปรึกษาด้านการตลาด",
    time: "1 ชั่วโมงที่แล้ว",
    icon: "fa-user-tie",
    iconColor: "#6c757d",
  },
  {
    id: "2",
    tab: "platform",
    title: "อัปเดตระบบเวอร์ชัน 2.4.0 (เสถียร)",
    snippet: "เราได้เพิ่มฟีเจอร์การวิเคราะห์ตลาดแบบเรียลไทม์ และปรับปรุงความเสถียรของระบบการชำระเงินใหม่",
    time: "2 ชั่วโมงที่แล้ว",
    icon: "fa-bullhorn",
    iconColor: "#0062E0",
  },
  {
    id: "4",
    tab: "platform",
    title: "ประกาศ: นโยบายความเป็นส่วนตัวฉบับปรับปรุง",
    snippet: "โปรดตรวจสอบการเปลี่ยนแปลงในข้อกำหนดการใช้งานเพื่อให้สอดคล้องกับการคุ้มครองข้อมูลส่วนบุคคล",
    time: "2 วันที่แล้ว",
    icon: "fa-shield-halved",
    iconColor: "#ED145B",
  },
  {
    id: "3",
    tab: "personal",
    title: "สุขสันต์วันเกิด! รับของขวัญพิเศษจากเรา",
    snippet: "วันนี้เป็นวันพิเศษของคุณ! เราขอมอบคูปองส่วนลด 20% แทนคำขอบคุณที่อยู่กับเรามาตลอด...",
    time: "1 วันที่แล้ว",
    icon: "fa-cake-candles",
    iconColor: "#FF70A6",
  },
  {
    id: "6",
    tab: "personal",
    title: "ได้รับเงินคืน (Cashback) สำเร็จ",
    snippet: "คุณได้รับเงินคืนจำนวน 50.00 บาท จากการสั่งซื้อหมายเลข #MET9982 เรียบร้อยแล้ว",
    time: "3 วันที่แล้ว",
    icon: "fa-wallet",
    iconColor: "#06D6A0",
  },
]
