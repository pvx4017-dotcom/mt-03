/** รายชื่อธนาคารในประเทศไทย สำหรับผูกบัญชีรับเงิน / บัญชีบริษัท */

export type ThaiBankGroup = "commercial" | "sfi" | "foreign" | "virtual"

export type ThaiBank = {
  value: string
  label: string
  group: ThaiBankGroup
}

export const THAI_BANK_GROUP_LABEL: Record<ThaiBankGroup, string> = {
  commercial: "ธนาคารพาณิชย์จดทะเบียนในประเทศ",
  sfi: "สถาบันการเงินเฉพาะกิจ",
  foreign: "สาขาธนาคารพาณิชย์ต่างประเทศ",
  virtual: "ธนาคารพาณิชย์ไร้สาขา",
}

export const THAI_BANKS: ThaiBank[] = [
  { value: "กรุงเทพ", label: "ธนาคารกรุงเทพ (BBL)", group: "commercial" },
  { value: "กสิกรไทย", label: "ธนาคารกสิกรไทย (KBANK)", group: "commercial" },
  { value: "กรุงไทย", label: "ธนาคารกรุงไทย (KTB)", group: "commercial" },
  { value: "ไทยพาณิชย์", label: "ธนาคารไทยพาณิชย์ (SCB)", group: "commercial" },
  { value: "ทหารไทยธนชาต", label: "ธนาคารทหารไทยธนชาต (TTB)", group: "commercial" },
  { value: "กรุงศรีอยุธยา", label: "ธนาคารกรุงศรีอยุธยา (BAY)", group: "commercial" },
  { value: "ซีไอเอ็มบีไทย", label: "ธนาคารซีไอเอ็มบีไทย (CIMBT)", group: "commercial" },
  { value: "ยูโอบี", label: "ธนาคารยูโอบี (UOB)", group: "commercial" },
  { value: "แลนด์แอนด์เฮ้าส์", label: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)", group: "commercial" },
  { value: "เกียรตินาคินภัทร", label: "ธนาคารเกียรตินาคินภัทร (KKP)", group: "commercial" },
  { value: "ทิสโก้", label: "ธนาคารทิสโก้ (TISCO)", group: "commercial" },
  { value: "ไทยเครดิต", label: "ธนาคารไทยเครดิต (TCRB)", group: "commercial" },
  { value: "ไอซีบีซี (ไทย)", label: "ธนาคารไอซีบีซี (ไทย) (ICBCT)", group: "commercial" },
  { value: "ธนาคารแห่งประเทศจีน (ไทย)", label: "ธนาคารแห่งประเทศจีน (ไทย) (BOC)", group: "commercial" },
  { value: "เมกะ สากลพาณิชย์", label: "ธนาคารเมกะ สากลพาณิชย์ (Mega ICBC)", group: "commercial" },
  { value: "สแตนดาร์ดชาร์เตอร์ด", label: "ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย) (SCBT)", group: "commercial" },
  { value: "ซูมิโตโม มิตซุย ทรัสต์ (ไทย)", label: "ธนาคารซูมิโตโม มิตซุย ทรัสต์ (ไทย) (SMTB)", group: "commercial" },
  { value: "ออมสิน", label: "ธนาคารออมสิน (GSB)", group: "sfi" },
  { value: "อาคารสงเคราะห์", label: "ธนาคารอาคารสงเคราะห์ (GHB)", group: "sfi" },
  { value: "ธ.ก.ส.", label: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส. / BAAC)", group: "sfi" },
  { value: "อิสลามแห่งประเทศไทย", label: "ธนาคารอิสลามแห่งประเทศไทย (IBANK)", group: "sfi" },
  { value: "เอ็กซิมแบงก์", label: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย (EXIM)", group: "sfi" },
  { value: "เอสเอ็มอีแบงก์", label: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย (SME Bank)", group: "sfi" },
  { value: "เอชเอสบีซี", label: "ธนาคารฮ่องกงและเซี่ยงไฮ้แบงกิ้งคอร์ปอเรชั่น จำกัด (HSBC)", group: "foreign" },
  { value: "ซิตี้แบงก์", label: "ธนาคารซิตี้แบงก์ เอ็น.เอ. (Citibank)", group: "foreign" },
  { value: "มิซูโฮ", label: "ธนาคารมิซูโฮ (Mizuho)", group: "foreign" },
  { value: "ซูมิโตโม มิตซุย", label: "ธนาคารซูมิโตโม มิตซุย แบงกิ้ง คอร์ปอเรชั่น (SMBC)", group: "foreign" },
  { value: "บีเอ็นพี พารีบาส์", label: "ธนาคารบีเอ็นพี พารีบาส์ (BNP Paribas)", group: "foreign" },
  { value: "ดอยซ์แบงก์", label: "ธนาคารดอยซ์แบงก์ (Deutsche Bank)", group: "foreign" },
  { value: "เจพีมอร์แกน", label: "ธนาคารเจพีมอร์แกน เชส (JPMorgan Chase)", group: "foreign" },
  { value: "อินเดียน โอเวอร์ซีส์", label: "ธนาคารอินเดียน โอเวอร์ซีส์ (Indian Overseas Bank)", group: "foreign" },
  { value: "อาร์เอชบี", label: "ธนาคารอาร์เอชบี (RHB)", group: "foreign" },
  { value: "ฮ่องกงลีออง", label: "ธนาคารฮ่องกงลีออง (Hong Leong Bank)", group: "foreign" },
  { value: "ธนาคารแห่งอเมริกา", label: "ธนาคารแห่งอเมริกาแห่งชาติ (Bank of America)", group: "foreign" },
  { value: "โซซิเอเต เจเนราล", label: "ธนาคารโซซิเอเต เจเนราล (Société Générale)", group: "foreign" },
  { value: "ธนาคารแห่งอินเดีย", label: "ธนาคารแห่งอินเดีย (Bank of India)", group: "foreign" },
  { value: "โอซีบีซี", label: "ธนาคารโอเวอร์ซี-ไชนีส แบงกิ้งคอร์ปอเรชั่น (OCBC)", group: "foreign" },
  { value: "คลิกซ์", label: "ธนาคารคลิกซ์ (ClickX)", group: "virtual" },
]

export const THAI_BANK_GROUPS: { id: ThaiBankGroup; label: string; banks: ThaiBank[] }[] = (
  ["commercial", "sfi", "foreign", "virtual"] as ThaiBankGroup[]
).map((id) => ({
  id,
  label: THAI_BANK_GROUP_LABEL[id],
  banks: THAI_BANKS.filter((b) => b.group === id),
}))
