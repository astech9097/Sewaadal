/**
 * Gets the current date in Asia/Kolkata timezone as a Date object
 */
function getDateInIST(): Date {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function startOfToday(): Date {
  // Use Asia/Kolkata (IST) time
  const today = getDateInIST();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Calendar-day bounds for a given date (local time). */
export function getDayBounds(input?: string | Date) {
  let d: Date;
  if (input) {
    if (typeof input === "string") {
      const [y, m, day] = input.split("T")[0].split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = input;
    }
  } else {
    d = getDateInIST();
  }
  
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Current calendar month bounds (local time). */
export function getMonthBounds(input?: string | Date) {
  let d: Date;
  if (input) {
    if (typeof input === "string") {
      const [y, m, day] = input.split("T")[0].split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = input;
    }
  } else {
    d = getDateInIST();
  }
  
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

export function getCurrentMonthLabel(input?: string | Date): string {
  let d: Date;
  if (input) {
    if (typeof input === "string") {
      const [y, m, day] = input.split("T")[0].split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = input;
    }
  } else {
    d = getDateInIST();
  }
  
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Build attendance timestamp from date + optional HH:mm. */
export function buildAttendanceDate(dateStr: string, timeStr?: string): Date {
  const [y, m, day] = dateStr.split("-").map(Number);
  const result = new Date(y, m - 1, day);
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    result.setHours(h, min, 0, 0);
  } else {
    result.setHours(12, 0, 0, 0);
  }
  return result;
}
