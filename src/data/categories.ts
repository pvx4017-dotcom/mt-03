export type SubCategory = { label: string; slug: string }

export type CategoryGroup = {
  id: string
  label: string
  subcategories: SubCategory[]
}

export const categoryGroups: CategoryGroup[] = [
  {
    id: "all",
    label: "สินค้าทั้งหมด",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "all" },
      { label: "สินค้ามาใหม่", slug: "new" },
      { label: "สินค้ายอดนิยม", slug: "popular" },
    ],
  },
  {
    id: "women",
    label: "เสื้อผ้าสตรี",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "women" },
      { label: "ชุดเดรส", slug: "dress" },
      { label: "เสื้อแฟชั่น", slug: "fashion" },
      { label: "กางเกงและกระโปรง", slug: "bottoms" },
    ],
  },
  {
    id: "kids",
    label: "เสื้อผ้าเด็ก",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "kids" },
      { label: "เสื้อผ้าเด็กอ่อน", slug: "baby" },
      { label: "เสื้อผ้าเด็กโต", slug: "kids-teen" },
    ],
  },
  {
    id: "men",
    label: "เสื้อผ้าผู้ชาย",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "men" },
      { label: "เสื้อยืด", slug: "tshirt" },
      { label: "กางเกงยีนส์", slug: "jeans" },
    ],
  },
  {
    id: "men-shoes",
    label: "รองเท้าผู้ชาย",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "men-shoes" },
      { label: "รองเท้าผ้าใบ", slug: "sneakers" },
      { label: "รองเท้าคัทชู", slug: "loafers" },
    ],
  },
  {
    id: "drinks",
    label: "เครื่องดื่ม",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "drinks" },
      { label: "ชาและกาแฟ", slug: "tea-coffee" },
      { label: "น้ำผลไม้", slug: "juice" },
    ],
  },
  {
    id: "computer",
    label: "คอมพิวเตอร์",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "computer" },
      { label: "โน้ตบุ๊ก", slug: "laptop" },
      { label: "อุปกรณ์เสริม", slug: "accessories" },
      { label: "อะไหล่คอมพิวเตอร์", slug: "parts" },
    ],
  },
  {
    id: "auto",
    label: "อุปกรณ์ยานยนต์",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "auto" },
      { label: "ของแต่งรถ", slug: "car-accessories" },
      { label: "น้ำมันสำรอง", slug: "oil" },
    ],
  },
  {
    id: "women-shoes",
    label: "รองเท้าสตรี",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "women-shoes" },
      { label: "รองเท้าส้นสูง", slug: "heels" },
      { label: "รองเท้าแตะแฟชั่น", slug: "sandals" },
    ],
  },
  {
    id: "medicine",
    label: "ยา",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "medicine" },
      { label: "ยาสามัญประจำบ้าน", slug: "otc" },
      { label: "อาหารเสริม", slug: "supplements" },
    ],
  },
  {
    id: "toys",
    label: "ของเล่นเครื่องดนตรี",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "toys" },
      { label: "ของเล่นไม้", slug: "wooden-toys" },
      { label: "เครื่องดนตรีเด็ก", slug: "kids-music" },
    ],
  },
  {
    id: "home",
    label: "เครื่องใช้ในบ้าน",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "home" },
      { label: "อุปกรณ์ในครัว", slug: "kitchen" },
      { label: "อุปกรณ์ทำความสะอาด", slug: "cleaning" },
      { label: "ตกแต่งบ้าน", slug: "decor" },
    ],
  },
  {
    id: "furniture",
    label: "เฟอร์นิเจอร์ตกแต่งบ้าน",
    subcategories: [
      { label: "ดูทั้งหมด", slug: "furniture" },
      { label: "โซฟาและเก้าอี้", slug: "sofa" },
      { label: "โต๊ะทำงาน", slug: "desk" },
    ],
  },
]

export const homeCategories = [
  { id: "1", name: "เสื้อผ้าสตรี", slug: "women", color: "beauty-gradient" },
  { id: "2", name: "เครื่องใช้ในบ้าน", slug: "home", color: "furniture-gradient" },
  { id: "3", name: "คอมพิวเตอร์", slug: "computer", color: "mobile-gradient" },
  { id: "4", name: "รองเท้า", slug: "women-shoes", color: "pets-gradient" },
  { id: "5", name: "เครื่องดื่ม", slug: "drinks", color: "health-gradient" },
  { id: "6", name: "ของเล่น", slug: "toys", color: "toys-gradient" },
  { id: "7", name: "เฟอร์นิเจอร์", slug: "furniture", color: "apps-gradient" },
  { id: "8", name: "ยา & สุขภาพ", slug: "medicine", color: "health-gradient" },
]
