
export type CategoryIconOption = {
  value: string // FontAwesome class string, e.g. 'fa-solid fa-church'. '' = no icon.
  label: string
  color: string // Fixed display color for this icon, regardless of category color.
}

export const CATEGORY_ICONS: CategoryIconOption[] = [
  { value: '', label: 'None', color: '#c6cad1' },
  { value: 'fa-solid fa-church', label: 'Church', color: '#71aba5' },
  { value: 'fa-solid fa-cross', label: 'Cross', color: '#b57c7c' },
  { value: 'fa-solid fa-hands-praying', label: 'Prayer', color: '#9994f0' },
  { value: 'fa-solid fa-bible', label: 'Bible', color: '#c09073' },
  { value: 'fa-solid fa-dove', label: 'Dove', color: '#70bfd2' },
  { value: 'fa-solid fa-people-group', label: 'Fellowship', color: '#81a5f3' },
  { value: 'fa-solid fa-children', label: 'Youth', color: '#f39e72' },
  { value: 'fa-solid fa-child', label: 'Children', color: '#ea82b0' },
  { value: 'fa-solid fa-graduation-cap', label: 'Education', color: '#7c98e8' },
  { value: 'fa-solid fa-bullhorn', label: 'Announcement', color: '#eb8181' },
  { value: 'fa-solid fa-handshake', label: 'Outreach', color: '#78ca96' },
  { value: 'fa-solid fa-hand-holding-heart', label: 'Ministry', color: '#d9768e' },
  { value: 'fa-solid fa-hand-holding-dollar', label: 'Offering', color: '#77b58e' },
  { value: 'fa-solid fa-gift', label: 'Pledge / Gift', color: '#c089f3' },
  { value: 'fa-solid fa-heart', label: 'Heart', color: '#ee7c95' },
  { value: 'fa-solid fa-star', label: 'Star', color: '#f3d370' },
  { value: 'fa-solid fa-flag', label: 'Flag', color: '#dc9172' },
  { value: 'fa-solid fa-globe', label: 'National', color: '#7d8dbb' },
  { value: 'fa-solid fa-map-marker-alt', label: 'Place', color: '#73c1ba' },
  { value: 'fa-solid fa-calendar-day', label: 'Event', color: '#b38df5' },
  { value: 'fa-solid fa-calendar-check', label: 'Scheduled', color: '#6ec2a8' },
  { value: 'fa-solid fa-clock', label: 'Time', color: '#9b9b9b' },
  { value: 'fa-solid fa-briefcase', label: 'Meeting', color: '#93908e' },
  { value: 'fa-solid fa-comments', label: 'Discussion', color: '#73cbf2' },
  { value: 'fa-solid fa-music', label: 'Music', color: '#c97bd1' },
  { value: 'fa-solid fa-microphone', label: 'Worship', color: '#da81e5' },
  { value: 'fa-solid fa-utensils', label: 'Fellowship Meal', color: '#d49b70' },
  { value: 'fa-solid fa-book-open', label: 'Study', color: '#74b0ab' },
  { value: 'fa-solid fa-cake-candles', label: 'Birthday', color: '#f495c4' },
  { value: 'fa-solid fa-champagne-glasses', label: 'Celebration', color: '#f9c771' },
  { value: 'fa-solid fa-ring', label: 'Anniversary', color: '#c67898' },
  { value: 'fa-solid fa-heart-circle-plus', label: 'Wedding', color: '#f2b1fc' },
  { value: 'fa-solid fa-baby', label: 'Baby / Dedication', color: '#8cd9fb' },
  { value: 'fa-solid fa-trophy', label: 'Achievement', color: '#e0bb6d' },
]

export function getIconColor(iconValue: string | undefined, fallbackColor: string): string {
  if (!iconValue) return fallbackColor
  const preset = CATEGORY_ICONS.find((ic) => ic.value === iconValue)
  return preset ? preset.color : fallbackColor
}