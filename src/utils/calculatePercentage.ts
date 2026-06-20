/** 4 approved PV days in a month = 100% baseline. P does not affect %. */
export const MIN_MONTHLY_PV = 4;

export type MonthlyAttendanceCounts = {
  present: number;
  presentVardi: number;
  absent: number;
};

/** @deprecated Use MIN_MONTHLY_PV */
export const MIN_MONTHLY_PRESENT = MIN_MONTHLY_PV;

/**
 * Monthly % = (approved PV only) ÷ 4 × 100
 * P and Absent do not change percentage.
 * Examples: 1 PV→25%, 2→50%, 3→75%, 4→100%
 */
export function calculateMemberMonthlyPercentage(
  counts: MonthlyAttendanceCounts
): {
  percentage: number;
  qualified: boolean;
  pvTotal: number;
  minRequired: number;
} {
  const minRequired = MIN_MONTHLY_PV;
  const pvTotal = counts.presentVardi;

  if (pvTotal === 0) {
    return { percentage: 0, qualified: false, pvTotal, minRequired };
  }

  const percentage = Math.round((pvTotal / minRequired) * 100);

  return {
    percentage,
    qualified: pvTotal >= minRequired,
    pvTotal,
    minRequired,
  };
}
