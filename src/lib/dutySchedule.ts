/** 0 = Sunday … 6 = Saturday (JavaScript Date.getDay()) */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEK_ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"] as const;

export const SEWA_SLOTS = [
  {
    key: "firstSewa",
    label: "First Sewa",
    weekField: "firstSewaWeek",
    dayField: "firstSewaDay",
  },
  {
    key: "secondSewa",
    label: "Second Sewa",
    weekField: "secondSewaWeek",
    dayField: "secondSewaDay",
  },
  {
    key: "thirdSewa",
    label: "Third Sewa",
    weekField: "thirdSewaWeek",
    dayField: "thirdSewaDay",
  },
  {
    key: "extraSewa1",
    label: "Extra Sewa 1",
    weekField: "extraSewa1Week",
    dayField: "extraSewa1Day",
  },
  {
    key: "extraSewa2",
    label: "Extra Sewa 2",
    weekField: "extraSewa2Week",
    dayField: "extraSewa2Day",
  },
] as const;

export type SewaSlotKey = (typeof SEWA_SLOTS)[number]["key"];
export type SewaWeekField = (typeof SEWA_SLOTS)[number]["weekField"];
export type SewaDayField = (typeof SEWA_SLOTS)[number]["dayField"];

export type UserSewaRecord = Partial<
  Record<SewaWeekField | SewaDayField, number | null>
> & { groups?: number[] };

export type SewaSlotValue = {
  weekOfMonth: number | null;
  dayOfWeek: number | null;
};

export type SewaFormState = Record<SewaSlotKey, SewaSlotValue>;

export type ResolvedSewa = {
  slotKey: SewaSlotKey;
  slotLabel: string;
  weekOfMonth: number;
  dayOfWeek: number;
  patternLabel: string;
  date: string;
  dateLabel: string;
  dayName: string;
};

/** Default group-based duty mapping */
export const GROUP_DUTY_MAPPING: Record<number, Array<{ week: number; day: number }>> = {
  1: [
    { week: 1, day: 2 }, // 1st Tuesday
    { week: 2, day: 2 }, // 2nd Tuesday
    { week: 1, day: 0 }, // 1st Sunday
  ],
  2: [
    { week: 3, day: 2 }, // 3rd Tuesday
    { week: 4, day: 2 }, // 4th Tuesday
    { week: 2, day: 0 }, // 2nd Sunday
  ],
  3: [
    { week: 1, day: 4 }, // 1st Thursday
    { week: 2, day: 4 }, // 2nd Thursday
    { week: 3, day: 0 }, // 3rd Sunday
  ],
  4: [
    { week: 3, day: 4 }, // 3rd Thursday
    { week: 4, day: 4 }, // 4th Thursday
    { week: 4, day: 0 }, // 4th Sunday
  ],
  5: [
    { week: 1, day: 6 }, // 1st Saturday
    { week: 2, day: 6 }, // 2nd Saturday
    { week: 4, day: 0 }, // 4th Sunday
  ],
  6: [
    { week: 3, day: 6 }, // 3rd Saturday
    { week: 4, day: 6 }, // 4th Saturday
    { week: 1, day: 0 }, // 1st Sunday
  ],
  7: [
    { week: 1, day: 0 }, // 1st Sunday
    { week: 2, day: 0 }, // 2nd Sunday
  ],
  8: [
    { week: 3, day: 0 }, // 3rd Sunday
    { week: 4, day: 0 }, // 4th Sunday
  ],
};

function ordinal(n: number): string {
  if (n >= 1 && n <= 5) return WEEK_ORDINALS[n - 1];
  return `${n}th`;
}

export function formatDutyLabel(weekOfMonth: number, dayOfWeek: number): string {
  const day = DAY_NAMES[dayOfWeek] ?? "Day";
  return `${ordinal(weekOfMonth)} ${day}`;
}

export function parseSewaSlot(
  weekOfMonth: unknown,
  dayOfWeek: unknown
): SewaSlotValue {
  const week = Number(weekOfMonth);
  const day = Number(dayOfWeek);
  if (
    !Number.isInteger(week) ||
    week < 1 ||
    week > 5 ||
    !Number.isInteger(day) ||
    day < 0 ||
    day > 6
  ) {
    return { weekOfMonth: null, dayOfWeek: null };
  }
  return { weekOfMonth: week, dayOfWeek: day };
}

export function sewaFormFromUser(user: UserSewaRecord): SewaFormState {
  const form = {} as SewaFormState;
  for (const slot of SEWA_SLOTS) {
    const week = user[slot.weekField];
    const day = user[slot.dayField];
    form[slot.key] = parseSewaSlot(week, day);
  }
  return form;
}

export function sewaUpdateFromForm(
  sewas: SewaFormState
): Record<SewaWeekField | SewaDayField, number | null> {
  const data = {} as Record<SewaWeekField | SewaDayField, number | null>;
  for (const slot of SEWA_SLOTS) {
    const value = parseSewaSlot(
      sewas[slot.key]?.weekOfMonth,
      sewas[slot.key]?.dayOfWeek
    );
    data[slot.weekField] = value.weekOfMonth;
    data[slot.dayField] = value.dayOfWeek;
  }
  return data;
}

/** Nth occurrence of a weekday in a calendar month (local time). */
export function getNthWeekdayInMonth(
  year: number,
  monthIndex: number,
  dayOfWeek: number,
  weekOfMonth: number
): Date | null {
  if (weekOfMonth < 1 || weekOfMonth > 5) return null;
  if (dayOfWeek < 0 || dayOfWeek > 6) return null;

  let count = 0;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getDay() === dayOfWeek) {
      count++;
      if (count === weekOfMonth) return d;
    }
  }

  return null;
}

export function resolveSewasForMonth(
  user: UserSewaRecord,
  referenceDate: Date = new Date()
): ResolvedSewa[] {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const resolved: ResolvedSewa[] = [];

  // Check if user has explicit sewa slots assigned
  const hasExplicitSewa = SEWA_SLOTS.some(slot => 
    user[slot.weekField] !== null && user[slot.dayField] !== null
  );

  // If no explicit sewa, use group-based duty (use all groups)
  if (!hasExplicitSewa && user.groups && user.groups.length > 0) {
    for (const group of user.groups) {
      const duties = GROUP_DUTY_MAPPING[group];
      if (duties) {
        duties.forEach(({ week, day }, index) => {
          const date = getNthWeekdayInMonth(year, monthIndex, day, week);
          if (date) {
            resolved.push({
              slotKey: SEWA_SLOTS[index % 5].key,
              slotLabel: `Group ${group} Duty`,
              weekOfMonth: week,
              dayOfWeek: day,
              patternLabel: formatDutyLabel(week, day),
              date: date.toISOString(),
              dateLabel: date.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              dayName: DAY_NAMES[day] ?? "",
            });
          }
        });
      }
    }
    if (resolved.length > 0) {
      return resolved.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }

  for (const slot of SEWA_SLOTS) {
    const week = user[slot.weekField];
    const day = user[slot.dayField];
    const parsed = parseSewaSlot(week, day);
    if (parsed.weekOfMonth == null || parsed.dayOfWeek == null) continue;

    const date = getNthWeekdayInMonth(
      year,
      monthIndex,
      parsed.dayOfWeek,
      parsed.weekOfMonth
    );
    if (!date) continue;

    const patternLabel = formatDutyLabel(parsed.weekOfMonth, parsed.dayOfWeek);

    resolved.push({
      slotKey: slot.key,
      slotLabel: slot.label,
      weekOfMonth: parsed.weekOfMonth,
      dayOfWeek: parsed.dayOfWeek,
      patternLabel,
      date: date.toISOString(),
      dateLabel: date.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      dayName: DAY_NAMES[parsed.dayOfWeek] ?? "",
    });
  }

  return resolved.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function hasAnySewaAssigned(user: UserSewaRecord): boolean {
  if (user.groups && user.groups.length > 0) {
    return user.groups.some(g => GROUP_DUTY_MAPPING[g] && GROUP_DUTY_MAPPING[g].length > 0);
  }

  return SEWA_SLOTS.some((slot) => {
    const parsed = parseSewaSlot(user[slot.weekField], user[slot.dayField]);
    return parsed.weekOfMonth != null && parsed.dayOfWeek != null;
  });
}
